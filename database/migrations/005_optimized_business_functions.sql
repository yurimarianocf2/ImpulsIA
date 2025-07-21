-- =============================================================================
-- FUNÇÕES DE NEGÓCIO OTIMIZADAS PARA N8N (SEM SESSÕES)
-- =============================================================================
-- Versão otimizada que trabalha apenas com dados persistentes
-- Redis gerencia sessões, Supabase gerencia dados de negócio
-- =============================================================================

-- 1. FUNÇÃO PRINCIPAL: BUSCAR PRODUTOS COM INTELIGÊNCIA
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

-- 2. FUNÇÃO: CADASTRAR CLIENTE VIA WHATSAPP
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
    
    RETURN QUERY
    SELECT 
        novo_cliente_id,
        mascara_nome(nome_cliente),
        TRUE,
        'Cliente cadastrado com sucesso! Bem-vindo à Farmácia Farmacus.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNÇÃO: CRIAR PEDIDO SEGURO
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
    
    -- Atualizar perfil do cliente
    PERFORM atualizar_perfil_cliente(telefone_cliente, NULL, NULL, valor_subtotal);
    
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

-- 4. FUNÇÃO: VERIFICAR PROMOÇÕES ATIVAS
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

-- 5. FUNÇÃO: RELATÓRIO DE ATENDIMENTO SIMPLIFICADO
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION relatorio_atendimento_whatsapp(
    data_inicio DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
    data_fim DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    clientes_cadastrados INTEGER,
    consultas_precos INTEGER,
    pedidos_criados INTEGER,
    promocoes_ativas INTEGER,
    produtos_mais_consultados JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Clientes cadastrados no período
        (SELECT COUNT(*) FROM clientes WHERE DATE(created_at) BETWEEN data_inicio AND data_fim)::INTEGER,
        
        -- Consultas de preços no período  
        (SELECT COUNT(*) FROM consultas_precos WHERE DATE(timestamp_consulta) BETWEEN data_inicio AND data_fim)::INTEGER,
        
        -- Pedidos criados no período
        (SELECT COUNT(*) FROM pedidos WHERE DATE(created_at) BETWEEN data_inicio AND data_fim)::INTEGER,
        
        -- Promoções ativas
        (SELECT COUNT(*) FROM promocoes WHERE ativa = true)::INTEGER,
        
        -- Top 5 produtos mais consultados
        (SELECT jsonb_agg(jsonb_build_object('produto', produto_pesquisado, 'consultas', total))
         FROM (
            SELECT produto_pesquisado, COUNT(*) as total
            FROM consultas_precos 
            WHERE DATE(timestamp_consulta) BETWEEN data_inicio AND data_fim
            GROUP BY produto_pesquisado 
            ORDER BY COUNT(*) DESC 
            LIMIT 5
         ) top_produtos) as produtos_mais_consultados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNÇÃO PARA N8N: INTERFACE SIMPLIFICADA
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION interface_n8n_farmacia(
    acao TEXT,
    telefone TEXT,
    dados JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
    resultado JSONB;
    cliente_contexto RECORD;
BEGIN
    CASE acao
        WHEN 'buscar_cliente' THEN
            -- Buscar contexto do cliente
            SELECT * INTO cliente_contexto FROM obter_contexto_persistente_cliente(telefone);
            
            resultado := jsonb_build_object(
                'sucesso', true,
                'cliente', row_to_json(cliente_contexto)
            );
            
        WHEN 'buscar_produto' THEN
            -- Buscar produtos
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', produto_id,
                    'nome', nome,
                    'preco', preco,
                    'promocao', tem_promocao,
                    'preco_promocional', preco_promocional,
                    'estoque', estoque
                )
            ) INTO resultado
            FROM buscar_produtos_inteligente(dados->>'termo', (dados->>'limite')::INTEGER);
            
            -- Registrar consulta
            PERFORM registrar_consulta_preco(
                telefone, 
                dados->>'termo',
                NULL, -- produto_id será preenchido se encontrado
                NULL, -- preço será preenchido se encontrado
                false,
                CASE WHEN resultado IS NOT NULL THEN 'encontrado' ELSE 'nao_encontrado' END
            );
            
            resultado := jsonb_build_object(
                'sucesso', true,
                'produtos', COALESCE(resultado, '[]'::jsonb)
            );
            
        WHEN 'cadastrar_cliente' THEN
            -- Cadastrar cliente
            SELECT jsonb_agg(row_to_json(cadastro.*)) INTO resultado
            FROM cadastrar_cliente_whatsapp(
                telefone,
                dados->>'nome',
                dados->>'email'
            ) cadastro;
            
            resultado := jsonb_build_object(
                'sucesso', true,
                'cadastro', resultado
            );
            
        WHEN 'promocoes' THEN
            -- Buscar promoções
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', promocao_id,
                    'produto', produto_nome,
                    'preco_normal', preco_normal,
                    'preco_promocional', preco_promocional,
                    'desconto', desconto_percentual
                )
            ) INTO resultado
            FROM verificar_promocoes_ativas();
            
            resultado := jsonb_build_object(
                'sucesso', true,
                'promocoes', COALESCE(resultado, '[]'::jsonb)
            );
            
        ELSE
            resultado := jsonb_build_object(
                'sucesso', false,
                'erro', 'Ação não reconhecida: ' || acao
            );
    END CASE;
    
    RETURN resultado;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Erro interno: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS PARA MANUTENÇÃO AUTOMÁTICA
-- =============================================================================

-- Função para limpar consultas antigas (manter apenas 3 meses)
CREATE OR REPLACE FUNCTION limpar_consultas_antigas()
RETURNS INTEGER AS $$
DECLARE
    linhas_removidas INTEGER;
BEGIN
    DELETE FROM consultas_precos 
    WHERE timestamp_consulta < NOW() - INTERVAL '3 months';
    
    GET DIAGNOSTICS linhas_removidas = ROW_COUNT;
    RETURN linhas_removidas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON FUNCTION buscar_produtos_inteligente IS 'Busca produtos com sistema de relevância para o chatbot';
COMMENT ON FUNCTION cadastrar_cliente_whatsapp IS 'Cadastra novo cliente via WhatsApp de forma segura';
COMMENT ON FUNCTION criar_pedido_whatsapp IS 'Cria pedidos via WhatsApp com validações de segurança';
COMMENT ON FUNCTION verificar_promocoes_ativas IS 'Retorna promoções ativas para oferecer ao cliente';
COMMENT ON FUNCTION interface_n8n_farmacia IS 'Interface unificada para N8N acessar funcionalidades da farmácia';

-- Verificar criação das funções
SELECT 
    'FUNÇÃO CRIADA: ' || routine_name as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'buscar_produtos_inteligente',
    'cadastrar_cliente_whatsapp', 
    'criar_pedido_whatsapp',
    'verificar_promocoes_ativas',
    'interface_n8n_farmacia'
)
ORDER BY routine_name;