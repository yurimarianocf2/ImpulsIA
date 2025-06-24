-- Script para verificar o status atual do banco de dados
-- Execute este script primeiro no Supabase SQL Editor para diagnosticar

-- 1. Verificar quais tabelas existem
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Verificar estrutura da tabela farmacias
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'farmacias'
ORDER BY ordinal_position;

-- 3. Verificar se existe tabela produtos
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'produtos' AND table_schema = 'public'
) as produtos_table_exists;

-- 4. Verificar se existe tabela analises_preco
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'analises_preco' AND table_schema = 'public'
) as analises_preco_table_exists;

-- 5. Verificar se a farmácia exemplo existe
SELECT 
    id,
    nome,
    cnpj,
    telefone
FROM farmacias 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- 6. Contar registros nas tabelas (se existirem)
SELECT 
    'farmacias' as tabela,
    COUNT(*) as total_registros
FROM farmacias
UNION ALL
SELECT 
    'produtos' as tabela,
    COUNT(*) as total_registros
FROM produtos
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'produtos')
UNION ALL
SELECT 
    'analises_preco' as tabela,
    COUNT(*) as total_registros
FROM analises_preco
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analises_preco');

-- 7. Verificar extensões habilitadas
SELECT 
    extname as extension_name,
    extversion as version
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_trgm', 'unaccent');

SELECT 'Diagnóstico concluído!' as status;