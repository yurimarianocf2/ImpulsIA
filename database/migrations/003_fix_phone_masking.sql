-- =============================================================================
-- CORREÇÃO: MASCARAMENTO DE TELEFONE MAIS ÚTIL
-- =============================================================================
-- Ajusta a função de mascaramento para mostrar DDD + primeiro dígito + 2 últimos
-- Exemplo: "5511987654321" vira "(55) 1****21"
-- =============================================================================

-- Substituir função de mascaramento de telefone
CREATE OR REPLACE FUNCTION mascara_telefone(telefone TEXT)
RETURNS TEXT AS $$
BEGIN
    IF telefone IS NULL OR LENGTH(telefone) < 8 THEN
        RETURN '(**) ****-****';
    END IF;
    
    -- Para telefone brasileiro com DDD (11+ dígitos)
    IF LENGTH(telefone) >= 11 THEN
        -- Formato: (DD) D****DD
        -- Exemplo: 5511987654321 -> (55) 1****21
        RETURN '(' || SUBSTRING(telefone FROM 1 FOR 2) || ') ' || 
               SUBSTRING(telefone FROM 3 FOR 1) || '****' || 
               RIGHT(telefone, 2);
    
    -- Para telefones menores (sem código do país)
    ELSEIF LENGTH(telefone) >= 9 THEN
        -- Formato: (DD) ****DD  
        -- Exemplo: 11987654321 -> (11) ****21
        RETURN '(' || SUBSTRING(telefone FROM 1 FOR 2) || ') ****' || 
               RIGHT(telefone, 2);
    
    ELSE
        -- Telefones muito pequenos - máscara completa
        RETURN '(**) ****-****';
    END IF;
    
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Atualizar comentário
COMMENT ON FUNCTION mascara_telefone IS 'Mascara telefone mostrando DDD + primeiro dígito + 2 últimos - Ex: (55) 1****21';