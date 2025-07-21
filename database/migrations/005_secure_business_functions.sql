-- =============================================================================
-- FUNÇÕES SEGURAS DE NEGÓCIO PARA INTEGRAÇÃO N8N
-- =============================================================================
-- Funções especializadas para o fluxo de atendimento WhatsApp da farmácia
-- Seguem as diretrizes de segurança e do manual do agente Farmacus
-- =============================================================================

-- 1. FUNÇÃO PRINCIPAL: PROCESSAR MENSAGEM WHATSAPP
-- -----------------------------------------------------------------------------
-- Esta é a função principal que o N8N deve chamar para cada mensagem

CREATE OR REPLACE FUNCTION processar_mensagem_whatsapp(
    telefone_cliente TEXT,
    mensagem_recebida TEXT,
    contexto_adicional JSONB DEFAULT '{}'
)
RETURNS TABLE(
    sessao_id UUID,
    resposta_sugerida TEXT,
    proximo_estado TEXT,
    dados_cliente JSONB,
    acoes_necessarias TEXT[],
    produtos_encontrados JSONB
) AS $$
DECLARE
    cliente_existe BOOLEAN := FALSE;
    contexto_atual JSONB;
    estado_atual TEXT;
    cliente_info RECORD;
BEGIN
    -- 1. Gerenciar sessão (criar/atualizar)
    PERFORM gerenciar_sessao_whatsapp(
        telefone_cliente, 
        NULL, -- não muda estado ainda
        mensagem_recebida, 
        NULL, -- resposta será definida depois
        contexto_adicional
    );
    
    -- 2. Buscar contexto do cliente
    SELECT * INTO cliente_info FROM obter_contexto_cliente(telefone_cliente);
    
    -- 3. Foco nos dados essenciais do cliente
    
    -- 4. Retornar dados para N8N processar
    RETURN QUERY
    SELECT 
        s.id as sessao_id,
        'Aguarde enquanto processamos sua solicitação...' as resposta_sugerida,
        s.estado_atual as proximo_estado,
        jsonb_build_object(
            'tem_cadastro', cliente_info.tem_cadastro,
            'nome_mascarado', cliente_info.nome_mascarado,
            'cliente_vip', cliente_info.cliente_vip,
            'total_pedidos', cliente_info.total_pedidos,
            'medicamentos_frequentes', cliente_info.medicamentos_frequentes
        ) as dados_cliente,
        CASE 
            WHEN NOT cliente_info.tem_cadastro THEN ARRAY['solicitar_cadastro']
            WHEN cliente_info.ultima_interacao_minutos > 60 THEN ARRAY['saudar_cliente', 'reativar_sessao']
            ELSE ARRAY['continuar_conversa']
        END as acoes_necessarias,
        '[]'::jsonb as produtos_encontrados
    FROM sessoes_whatsapp s
    WHERE s.telefone = telefone_cliente;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FUNÇÃO: BUSCAR PRODUTOS COM INTELIGÊNCIA
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION buscar_produtos_inteligente(
    termo_busca TEXT,
    limite INTEGER DEFAULT 5
)
RETURNS TABLE(
    produto_id BIGINT,
    nome TEXT,
    descricao TEXT,
    categoria TEXT,
    preco NUMERIC,
    tem_promocao BOOLEAN,
    preco_promocional NUMERIC,
    estoque INTEGER,
    relevancia INTEGER
) AS $$
BEGIN
    -- Registrar a consulta
    INSERT INTO consultas_precos (telefone, produto_pesquisado, resultado)
    VALUES ('system', termo_busca, 'buscando');
    
    RETURN QUERY
    SELECT 
        p.produto_id,
        p.nome,
        p.descricao,
        p.categoria,
        p.preco,
        (p.promocao_flag = 'S') as tem_promocao,
        p.preco_promocional,
        p.estoque,
        -- Sistema de relevância simples
        CASE 
            WHEN LOWER(p.nome) LIKE LOWER('%' || termo_busca || '%') THEN 3
            WHEN LOWER(p.descricao) LIKE LOWER('%' || termo_busca || '%') THEN 2
            WHEN LOWER(p.categoria) LIKE LOWER('%' || termo_busca || '%') THEN 1
            ELSE 0
        END as relevancia
    FROM produtos p
    WHERE p.ativo = true
    AND (
        LOWER(p.nome) LIKE LOWER('%' || termo_busca || '%') OR
        LOWER(p.descricao) LIKE LOWER('%' || termo_busca || '%') OR
        LOWER(p.categoria) LIKE LOWER('%' || termo_busca || '%')
    )
    ORDER BY relevancia DESC, p.preco ASC
    LIMIT limite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNÇÃO: CADASTRAR CLIENTE VIA WHATSAPP
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cadastrar_cliente_whatsapp(
    telefone_cliente TEXT,
    nome_cliente TEXT,
    email_cliente TEXT DEFAULT NULL
)
RETURNS TABLE(
    cliente_id UUID,
    nome_mascarado TEXT,
    sucesso BOOLEAN,
    mensagem TEXT
) AS $$
DECLARE
    novo_cliente_id UUID;
    cliente_existente UUID;
BEGIN
    -- Verificar se já existe
    SELECT c.cliente_id INTO cliente_existente 
    FROM clientes c WHERE c.telefone = telefone_cliente;
    
    IF cliente_existente IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            cliente_existente,
            mascara_nome(nome_cliente),
            FALSE,
            'Cliente já cadastrado com este telefone';
        RETURN;
    END IF;
    
    -- Criar novo cliente
    INSERT INTO clientes (nome, email, telefone)
    VALUES (nome_cliente, email_cliente, telefone_cliente)
    RETURNING clientes.cliente_id INTO novo_cliente_id;
    
    -- Criar perfil básico
    INSERT INTO cliente_perfil (cliente_id, prefere_promocoes, aceita_sugestoes)
    VALUES (novo_cliente_id, true, true);
    
    -- Atualizar sessão com cliente_id
    UPDATE sessoes_whatsapp 
    SET cliente_id = novo_cliente_id,
        estado_atual = 'confirmando_cliente'
    WHERE telefone = telefone_cliente;
    
    RETURN QUERY
    SELECT 
        novo_cliente_id,
        mascara_nome(nome_cliente),
        TRUE,
        'Cliente cadastrado com sucesso! Bem-vindo à Farmácia Farmacus.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNÇÃO: CRIAR PEDIDO SEGURO
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION criar_pedido_whatsapp(
    telefone_cliente TEXT,
    produtos_pedido JSONB, -- [{"produto_id": 1, "quantidade": 2}]
    endereco_entrega TEXT DEFAULT NULL,
    observacoes TEXT DEFAULT NULL
)
RETURNS TABLE(
    pedido_id UUID,
    numero_pedido TEXT,
    subtotal NUMERIC,
    total NUMERIC,
    sucesso BOOLEAN,
    mensagem TEXT
) AS $$
DECLARE
    cliente_id_pedido UUID;
    novo_pedido_id UUID;
    novo_numero_pedido TEXT;
    valor_subtotal NUMERIC := 0;
    produto_item JSONB;
    produto_preco NUMERIC;
BEGIN
    -- Buscar cliente
    SELECT c.cliente_id INTO cliente_id_pedido
    FROM clientes c WHERE c.telefone = telefone_cliente;
    
    IF cliente_id_pedido IS NULL THEN
        RETURN QUERY
        SELECT 
            NULL::UUID,
            NULL::TEXT,
            0::NUMERIC,
            0::NUMERIC,
            FALSE,
            'Cliente não encontrado. Faça seu cadastro primeiro.';
        RETURN;
    END IF;
    
    -- Calcular subtotal
    FOR produto_item IN SELECT * FROM jsonb_array_elements(produtos_pedido)
    LOOP
        SELECT 
            CASE 
                WHEN p.promocao_flag = 'S' AND p.preco_promocional IS NOT NULL 
                THEN p.preco_promocional 
                ELSE p.preco 
            END INTO produto_preco
        FROM produtos p 
        WHERE p.produto_id = (produto_item->>'produto_id')::BIGINT;
        
        valor_subtotal := valor_subtotal + (produto_preco * (produto_item->>'quantidade')::INTEGER);
    END LOOP;
    
    -- Criar pedido
    INSERT INTO pedidos (
        cliente_id, subtotal, total, status, observacoes, endereco_entrega_mascara
    )
    VALUES (
        cliente_id_pedido, valor_subtotal, valor_subtotal, 'pendente', 
        observacoes, mascara_endereco(COALESCE(endereco_entrega, 'Endereço a confirmar'))
    )
    RETURNING id, pedido_numero INTO novo_pedido_id, novo_numero_pedido;
    
    -- Atualizar métricas da sessão
    UPDATE sessoes_whatsapp 
    SET total_pedidos_criados = total_pedidos_criados + 1,
        estado_atual = 'confirmando_pedido'
    WHERE telefone = telefone_cliente;
    
    -- Atualizar perfil do cliente
    UPDATE cliente_perfil 
    SET total_pedidos = total_pedidos + 1,
        ultima_compra_em = NOW(),
        ticket_medio = CASE 
            WHEN total_pedidos = 0 THEN valor_subtotal
            ELSE (COALESCE(ticket_medio, 0) * total_pedidos + valor_subtotal) / (total_pedidos + 1)
        END
    WHERE cliente_id = cliente_id_pedido;
    
    RETURN QUERY
    SELECT 
        novo_pedido_id,
        novo_numero_pedido,
        valor_subtotal,
        valor_subtotal,
        TRUE,
        'Pedido criado com sucesso! Número: ' || novo_numero_pedido;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNÇÃO: VERIFICAR PROMOÇÕES ATIVAS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verificar_promocoes_ativas()
RETURNS TABLE(
    promocao_id BIGINT,
    produto_nome TEXT,
    preco_normal NUMERIC,
    preco_promocional NUMERIC,
    desconto_percentual INTEGER,
    apresentacao TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.id as promocao_id,
        pr.nome as produto_nome,
        pr.preco_normal,
        pr.preco_promocional,
        ROUND(((pr.preco_normal - pr.preco_promocional) / pr.preco_normal * 100))::INTEGER as desconto_percentual,
        pr.apresentacao
    FROM promocoes pr
    WHERE pr.ativa = true
    AND (pr.data_fim IS NULL OR pr.data_fim > NOW())
    ORDER BY desconto_percentual DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNÇÃO: OBTER RELATÓRIO DE ATENDIMENTO
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION relatorio_atendimento_whatsapp(
    data_inicio DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
    data_fim DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_sessoes INTEGER,
    clientes_unicos INTEGER,
    total_mensagens INTEGER,
    consultas_precos INTEGER,
    pedidos_criados INTEGER,
    taxa_conversao NUMERIC,
    sessoes_ativas INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT s.id)::INTEGER as total_sessoes,
        COUNT(DISTINCT s.telefone)::INTEGER as clientes_unicos,
        SUM(s.total_mensagens)::INTEGER as total_mensagens,
        COUNT(DISTINCT cp.id)::INTEGER as consultas_precos,
        SUM(s.total_pedidos_criados)::INTEGER as pedidos_criados,
        CASE 
            WHEN COUNT(DISTINCT cp.id) > 0 THEN 
                ROUND((SUM(s.total_pedidos_criados) * 100.0 / COUNT(DISTINCT cp.id)), 2)
            ELSE 0
        END as taxa_conversao,
        COUNT(CASE WHEN s.ativa THEN 1 END)::INTEGER as sessoes_ativas
    FROM sessoes_whatsapp s
    LEFT JOIN consultas_precos cp ON s.telefone = cp.telefone
    WHERE s.sessao_iniciada_em::DATE BETWEEN data_inicio AND data_fim;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS PARA MANUTENÇÃO AUTOMÁTICA
-- =============================================================================

-- Trigger para limpar sessões antigas
CREATE OR REPLACE FUNCTION limpar_sessoes_inativas()
RETURNS TRIGGER AS $$
BEGIN
    -- Desativar sessões com mais de 24h sem interação
    UPDATE sessoes_whatsapp 
    SET ativa = false
    WHERE ultima_interacao < NOW() - INTERVAL '24 hours'
    AND ativa = true;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Executar limpeza quando uma nova sessão é criada
CREATE TRIGGER trigger_limpar_sessoes
    AFTER INSERT ON sessoes_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION limpar_sessoes_inativas();

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON FUNCTION processar_mensagem_whatsapp IS 'Função principal para processar mensagens do WhatsApp no N8N';
COMMENT ON FUNCTION buscar_produtos_inteligente IS 'Busca produtos com sistema de relevância para o chatbot';
COMMENT ON FUNCTION cadastrar_cliente_whatsapp IS 'Cadastra novo cliente via WhatsApp de forma segura';
COMMENT ON FUNCTION criar_pedido_whatsapp IS 'Cria pedidos via WhatsApp com validações de segurança';
COMMENT ON FUNCTION verificar_promocoes_ativas IS 'Retorna promoções ativas para oferecer ao cliente';
COMMENT ON FUNCTION relatorio_atendimento_whatsapp IS 'Gera relatórios de performance do atendimento WhatsApp';