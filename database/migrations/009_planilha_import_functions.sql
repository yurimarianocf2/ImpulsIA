-- =============================================================================
-- FUNÇÕES SEGURAS PARA IMPORTAÇÃO DE PLANILHAS
-- =============================================================================
-- Funções para validar e importar dados das planilhas de forma segura
-- =============================================================================

-- 1. FUNÇÃO PARA VALIDAR ESTRUTURA DE PRODUTOS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validar_planilha_produtos(dados JSONB)
RETURNS JSONB AS $$
DECLARE
    erro_count INTEGER := 0;
    erros TEXT[] := '{}';
    produto JSONB;
    linha_num INTEGER := 0;
BEGIN
    -- Validar se é um array
    IF jsonb_typeof(dados) != 'array' THEN
        RETURN jsonb_build_object(
            'valido', false,
            'erros', ARRAY['Dados devem ser um array de produtos'],
            'total_linhas', 0
        );
    END IF;
    
    -- Validar cada produto
    FOR produto IN SELECT * FROM jsonb_array_elements(dados)
    LOOP
        linha_num := linha_num + 1;
        
        -- Validar campos obrigatórios
        IF produto->>'nome' IS NULL OR trim(produto->>'nome') = '' THEN
            erros := erros || ('Linha ' || linha_num || ': Nome é obrigatório');
            erro_count := erro_count + 1;
        END IF;
        
        IF produto->>'preco' IS NULL OR NOT (produto->>'preco' ~ '^[0-9]+\.?[0-9]*$') THEN
            erros := erros || ('Linha ' || linha_num || ': Preço deve ser um número válido');
            erro_count := erro_count + 1;
        END IF;
        
        IF produto->>'estoque' IS NULL OR NOT (produto->>'estoque' ~ '^[0-9]+$') THEN
            erros := erros || ('Linha ' || linha_num || ': Estoque deve ser um número inteiro');
            erro_count := erro_count + 1;
        END IF;
        
        -- Validar categoria
        IF produto->>'categoria' IS NOT NULL AND 
           NOT (produto->>'categoria' IN ('analgesicos', 'antibioticos', 'vitaminas', 'gastroenterologia', 'dermatologia', 'cardiologia', 'outros')) THEN
            erros := erros || ('Linha ' || linha_num || ': Categoria inválida. Use: analgesicos, antibioticos, vitaminas, gastroenterologia, dermatologia, cardiologia, outros');
            erro_count := erro_count + 1;
        END IF;
        
        -- Validar prescricao_obrigatoria
        IF produto->>'prescricao_obrigatoria' IS NOT NULL AND 
           NOT (produto->>'prescricao_obrigatoria' IN ('true', 'false')) THEN
            erros := erros || ('Linha ' || linha_num || ': prescricao_obrigatoria deve ser true ou false');
            erro_count := erro_count + 1;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'valido', erro_count = 0,
        'total_linhas', linha_num,
        'total_erros', erro_count,
        'erros', erros
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FUNÇÃO PARA IMPORTAR PRODUTOS DE FORMA SEGURA
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION importar_produtos_planilha(dados JSONB)
RETURNS JSONB AS $$
DECLARE
    validacao JSONB;
    produto JSONB;
    produtos_inseridos INTEGER := 0;
    produtos_atualizados INTEGER := 0;
BEGIN
    -- Validar primeiro
    SELECT validar_planilha_produtos(dados) INTO validacao;
    
    IF NOT (validacao->>'valido')::BOOLEAN THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Planilha contém erros de validação',
            'detalhes', validacao
        );
    END IF;
    
    -- Importar produtos
    FOR produto IN SELECT * FROM jsonb_array_elements(dados)
    LOOP
        INSERT INTO produtos (
            nome,
            descricao,
            categoria,
            preco,
            estoque,
            codigo_barras,
            principio_ativo,
            apresentacao,
            laboratorio,
            prescricao_obrigatoria,
            ativo
        ) VALUES (
            produto->>'nome',
            produto->>'descricao',
            COALESCE(produto->>'categoria', 'outros'),
            (produto->>'preco')::DECIMAL,
            (produto->>'estoque')::INTEGER,
            produto->>'codigo_barras',
            produto->>'principio_ativo',
            produto->>'apresentacao',
            produto->>'laboratorio',
            COALESCE((produto->>'prescricao_obrigatoria')::BOOLEAN, false),
            COALESCE((produto->>'ativo')::BOOLEAN, true)
        )
        ON CONFLICT (nome) DO UPDATE SET
            descricao = EXCLUDED.descricao,
            categoria = EXCLUDED.categoria,
            preco = EXCLUDED.preco,
            estoque = EXCLUDED.estoque,
            codigo_barras = EXCLUDED.codigo_barras,
            principio_ativo = EXCLUDED.principio_ativo,
            apresentacao = EXCLUDED.apresentacao,
            laboratorio = EXCLUDED.laboratorio,
            prescricao_obrigatoria = EXCLUDED.prescricao_obrigatoria,
            ativo = EXCLUDED.ativo,
            atualizado_em = NOW();
        
        -- Verificar se foi inserção ou atualização
        IF FOUND THEN
            produtos_atualizados := produtos_atualizados + 1;
        ELSE
            produtos_inseridos := produtos_inseridos + 1;
        END IF;
    END LOOP;
    
    -- Log da operação
    INSERT INTO log_acesso_dados (telefone_hash, acao, dados_acessados)
    VALUES (
        'admin_import',
        'import_produtos_planilha',
        ARRAY[
            produtos_inseridos::TEXT || ' produtos inseridos',
            produtos_atualizados::TEXT || ' produtos atualizados'
        ]
    );
    
    RETURN jsonb_build_object(
        'sucesso', true,
        'produtos_inseridos', produtos_inseridos,
        'produtos_atualizados', produtos_atualizados,
        'total_processados', (validacao->>'total_linhas')::INTEGER
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNÇÃO PARA VALIDAR PROMOÇÕES
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validar_planilha_promocoes(dados JSONB)
RETURNS JSONB AS $$
DECLARE
    erro_count INTEGER := 0;
    erros TEXT[] := '{}';
    promocao JSONB;
    linha_num INTEGER := 0;
    produto_exists BOOLEAN;
BEGIN
    IF jsonb_typeof(dados) != 'array' THEN
        RETURN jsonb_build_object(
            'valido', false,
            'erros', ARRAY['Dados devem ser um array de promoções']
        );
    END IF;
    
    FOR promocao IN SELECT * FROM jsonb_array_elements(dados)
    LOOP
        linha_num := linha_num + 1;
        
        -- Validar produto existe (por nome ou código de barras)
        IF promocao->>'produto_nome' IS NOT NULL THEN
            SELECT EXISTS(
                SELECT 1 FROM produtos 
                WHERE nome = promocao->>'produto_nome' OR codigo_barras = promocao->>'produto_codigo_barras'
            ) INTO produto_exists;
            
            IF NOT produto_exists THEN
                erros := erros || ('Linha ' || linha_num || ': Produto não encontrado: ' || (promocao->>'produto_nome'));
                erro_count := erro_count + 1;
            END IF;
        END IF;
        
        -- Validar preços
        IF promocao->>'preco_normal' IS NULL OR NOT (promocao->>'preco_normal' ~ '^[0-9]+\.?[0-9]*$') THEN
            erros := erros || ('Linha ' || linha_num || ': Preço normal deve ser um número válido');
            erro_count := erro_count + 1;
        END IF;
        
        IF promocao->>'preco_promocional' IS NULL OR NOT (promocao->>'preco_promocional' ~ '^[0-9]+\.?[0-9]*$') THEN
            erros := erros || ('Linha ' || linha_num || ': Preço promocional deve ser um número válido');
            erro_count := erro_count + 1;
        END IF;
        
        -- Validar datas
        IF promocao->>'data_inicio' IS NOT NULL THEN
            BEGIN
                PERFORM (promocao->>'data_inicio')::DATE;
            EXCEPTION WHEN OTHERS THEN
                erros := erros || ('Linha ' || linha_num || ': Data de início inválida (use formato YYYY-MM-DD)');
                erro_count := erro_count + 1;
            END;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'valido', erro_count = 0,
        'total_linhas', linha_num,
        'total_erros', erro_count,
        'erros', erros
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNÇÃO PARA IMPORTAR PROMOÇÕES
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION importar_promocoes_planilha(dados JSONB)
RETURNS JSONB AS $$
DECLARE
    validacao JSONB;
    promocao JSONB;
    promocoes_inseridas INTEGER := 0;
    produto_id_encontrado BIGINT;
BEGIN
    -- Validar primeiro
    SELECT validar_planilha_promocoes(dados) INTO validacao;
    
    IF NOT (validacao->>'valido')::BOOLEAN THEN
        RETURN jsonb_build_object(
            'sucesso', false,
            'erro', 'Planilha contém erros de validação',
            'detalhes', validacao
        );
    END IF;
    
    FOR promocao IN SELECT * FROM jsonb_array_elements(dados)
    LOOP
        -- Buscar produto_id
        SELECT produto_id INTO produto_id_encontrado
        FROM produtos 
        WHERE nome = promocao->>'produto_nome' 
           OR codigo_barras = promocao->>'produto_codigo_barras'
        LIMIT 1;
        
        IF produto_id_encontrado IS NOT NULL THEN
            INSERT INTO promocoes (
                produto_id,
                nome,
                apresentacao,
                preco_normal,
                preco_promocional,
                desconto_percentual,
                data_inicio,
                data_fim,
                ativa
            ) VALUES (
                produto_id_encontrado,
                promocao->>'nome_promocao',
                promocao->>'apresentacao',
                (promocao->>'preco_normal')::DECIMAL,
                (promocao->>'preco_promocional')::DECIMAL,
                COALESCE((promocao->>'desconto_percentual')::DECIMAL, 
                    ROUND(((promocao->>'preco_normal')::DECIMAL - (promocao->>'preco_promocional')::DECIMAL) * 100 / (promocao->>'preco_normal')::DECIMAL, 2)
                ),
                COALESCE((promocao->>'data_inicio')::DATE, CURRENT_DATE),
                CASE WHEN promocao->>'data_fim' IS NOT NULL THEN (promocao->>'data_fim')::DATE ELSE NULL END,
                COALESCE((promocao->>'ativa')::BOOLEAN, true)
            )
            ON CONFLICT (produto_id) DO UPDATE SET
                nome = EXCLUDED.nome,
                apresentacao = EXCLUDED.apresentacao,
                preco_normal = EXCLUDED.preco_normal,
                preco_promocional = EXCLUDED.preco_promocional,
                desconto_percentual = EXCLUDED.desconto_percentual,
                data_inicio = EXCLUDED.data_inicio,
                data_fim = EXCLUDED.data_fim,
                ativa = EXCLUDED.ativa;
                
            promocoes_inseridas := promocoes_inseridas + 1;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'sucesso', true,
        'promocoes_processadas', promocoes_inseridas,
        'total_linhas', (validacao->>'total_linhas')::INTEGER
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON FUNCTION validar_planilha_produtos IS 'Valida estrutura e dados da planilha de produtos antes da importação';
COMMENT ON FUNCTION importar_produtos_planilha IS 'Importa produtos de forma segura após validação';
COMMENT ON FUNCTION validar_planilha_promocoes IS 'Valida estrutura e dados da planilha de promoções';
COMMENT ON FUNCTION importar_promocoes_planilha IS 'Importa promoções de forma segura após validação';