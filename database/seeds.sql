-- ============================================================================
-- FARMABOT PRO - DADOS DE TESTE (SEEDS)
-- População inicial do banco com dados realistas
-- ============================================================================

-- ============================================================================
-- DADOS DE PRODUTOS FARMACÊUTICOS
-- ============================================================================

-- Obter ID da farmácia padrão
DO $$
DECLARE
    farmacia_default_id UUID;
BEGIN
    SELECT id INTO farmacia_default_id FROM farmacias LIMIT 1;
    
    -- MEDICAMENTOS MAIS VENDIDOS NO BRASIL
    INSERT INTO produtos (farmacia_id, codigo_barras, nome, nome_generico, principio_ativo, laboratorio, categoria, subcategoria, dosagem, apresentacao, registro_anvisa, preco_venda, preco_custo, estoque_atual, estoque_minimo, data_vencimento, lote, fornecedor, descricao, indicacoes, contraindicacoes, posologia, tags) VALUES
    
    -- ANALGÉSICOS E ANTIPIRÉTICOS
    (farmacia_default_id, '7891058003951', 'Dipirona Sódica EMS', 'Dipirona Sódica', 'Dipirona Sódica', 'EMS', 'Medicamentos', 'Analgésicos', '500mg', 'Caixa com 10 comprimidos', '1.0235.0112', 8.50, 5.20, 45, 10, '2025-12-15', 'L240815', 'EMS S/A', 'Analgésico e antitérmico de ação rápida', 'Dor e febre', 'Hipersensibilidade ao princípio ativo', '1 comprimido de 6/6h', ARRAY['dor', 'febre', 'analgésico', 'dipirona']),
    
    (farmacia_default_id, '7896422502863', 'Paracetamol Neo Química', 'Paracetamol', 'Paracetamol', 'Neo Química', 'Medicamentos', 'Analgésicos', '750mg', 'Caixa com 20 comprimidos', '1.0298.0087', 12.90, 8.45, 35, 15, '2025-11-20', 'L240720', 'Neo Química', 'Analgésico e antitérmico eficaz', 'Dor e febre', 'Doenças hepáticas graves', '1 comprimido de 6/6h', ARRAY['dor', 'febre', 'paracetamol']),
    
    (farmacia_default_id, '7891058001124', 'Ibuprofeno Prati', 'Ibuprofeno', 'Ibuprofeno', 'Prati-Donaduzzi', 'Medicamentos', 'Anti-inflamatórios', '600mg', 'Caixa com 10 comprimidos', '1.0156.0245', 15.80, 9.90, 28, 8, '2025-10-30', 'L240630', 'Prati-Donaduzzi', 'Anti-inflamatório não esteroidal', 'Dor e inflamação', 'Úlcera péptica ativa', '1 comprimido de 8/8h', ARRAY['dor', 'inflamação', 'ibuprofeno']),
    
    -- ANTIÁCIDOS E DIGESTIVOS
    (farmacia_default_id, '7891058002289', 'Omeprazol EMS', 'Omeprazol', 'Omeprazol', 'EMS', 'Medicamentos', 'Antiácidos', '20mg', 'Caixa com 14 cápsulas', '1.0235.0298', 25.90, 16.80, 22, 5, '2025-09-15', 'L240515', 'EMS S/A', 'Inibidor da bomba de prótons', 'Úlcera e refluxo', 'Hipersensibilidade conhecida', '1 cápsula em jejum', ARRAY['estômago', 'úlcera', 'refluxo', 'omeprazol']),
    
    (farmacia_default_id, '7896422503487', 'Pantoprazol Germed', 'Pantoprazol', 'Pantoprazol Sódico', 'Germed', 'Medicamentos', 'Antiácidos', '40mg', 'Caixa com 14 comprimidos', '1.0412.0156', 32.50, 21.30, 18, 6, '2025-08-22', 'L240422', 'Germed Pharma', 'Protetor gástrico avançado', 'DRGE e úlceras', 'Gravidez categoria B', '1 comprimido/dia', ARRAY['estômago', 'protetor gástrico', 'pantoprazol']),
    
    (farmacia_default_id, '7891058003654', 'Estomazil EMS', 'Hidróxido de Alumínio + Magnésio', 'Hidróxido de Alumínio + Magnésio', 'EMS', 'Medicamentos', 'Antiácidos', '61,5mg + 39,5mg/mL', 'Frasco 240ml', '1.0235.0445', 18.90, 12.40, 31, 8, '2025-07-10', 'L240310', 'EMS S/A', 'Antiácido de ação rápida', 'Azia e má digestão', 'Insuficiência renal', '15ml após refeições', ARRAY['azia', 'antiácido', 'digestão']),
    
    -- ANTIBIÓTICOS (CONTROLADOS)
    (farmacia_default_id, '7891058004187', 'Amoxicilina EMS', 'Amoxicilina', 'Amoxicilina', 'EMS', 'Medicamentos', 'Antibióticos', '500mg', 'Caixa com 21 cápsulas', '1.0235.0712', 28.90, 18.90, 15, 5, '2025-06-18', 'L240318', 'EMS S/A', 'Antibiótico de amplo espectro', 'Infecções bacterianas', 'Alergia à penicilina', '1 cápsula de 8/8h', ARRAY['antibiótico', 'infecção', 'amoxicilina']),
    
    (farmacia_default_id, '7896422504125', 'Azitromicina Medley', 'Azitromicina', 'Azitromicina Di-hidratada', 'Medley', 'Medicamentos', 'Antibióticos', '500mg', 'Caixa com 5 comprimidos', '1.0389.0234', 45.80, 32.20, 12, 4, '2025-05-25', 'L240225', 'Medley Pharma', 'Macrolídeo de dose única', 'Infecções respiratórias', 'Disfunção hepática', '1 comprimido/dia por 3 dias', ARRAY['antibiótico', 'respiratório', 'azitromicina']),
    
    -- VITAMINAS E SUPLEMENTOS
    (farmacia_default_id, '7891058005234', 'Vitamina C EMS', 'Ácido Ascórbico', 'Ácido Ascórbico', 'EMS', 'Vitaminas', 'Vitamina C', '1g', 'Caixa com 10 comprimidos efervescentes', '1.0235.0823', 16.90, 10.80, 42, 12, '2026-01-30', 'L241030', 'EMS S/A', 'Vitamina C de alta concentração', 'Deficiência de vitamina C', 'Cálculos renais', '1 comprimido/dia', ARRAY['vitamina', 'imunidade', 'vitamina c']),
    
    (farmacia_default_id, '7896422505678', 'Complexo B Medley', 'Complexo B', 'Vitaminas do Complexo B', 'Medley', 'Vitaminas', 'Complexo B', 'Multivitamínico', 'Caixa com 60 drágeas', '1.0389.0567', 24.50, 16.20, 38, 10, '2026-02-15', 'L241115', 'Medley Pharma', 'Suporte energético e neurológico', 'Deficiências nutricionais', 'Hipervitaminose', '1 drágea/dia', ARRAY['vitamina', 'energia', 'complexo b']),
    
    -- PRODUTOS DE HIGIENE E BELEZA
    (farmacia_default_id, '7891234567890', 'Protetor Solar EPISOL', 'Protetor Solar', 'Octinoxato + Avobenzona', 'Episol', 'Higiene', 'Proteção Solar', 'FPS 60', 'Frasco 120ml', 'MS 2.0456.0123', 35.90, 24.50, 25, 6, '2026-03-20', 'L241220', 'Mantecorp', 'Proteção solar avançada', 'Proteção UV', 'Alergia aos filtros', 'Aplicar 30min antes da exposição', ARRAY['protetor solar', 'fps 60', 'pele']),
    
    (farmacia_default_id, '7891234567901', 'Shampoo Anticaspa Selsun', 'Sulfeto de Selênio', 'Sulfeto de Selênio', 'Sanofi', 'Higiene', 'Cabelo', '2,5%', 'Frasco 120ml', 'MS 1.2345.0789', 28.90, 19.20, 33, 8, '2026-04-10', 'L241210', 'Sanofi', 'Tratamento anticaspa eficaz', 'Caspa e dermatite seborreica', 'Feridas no couro cabeludo', '2-3x por semana', ARRAY['anticaspa', 'cabelo', 'dermatite']),
    
    -- MEDICAMENTOS INFANTIS
    (farmacia_default_id, '7891058006789', 'Dipirona Gotas Infantil EMS', 'Dipirona Sódica', 'Dipirona Sódica', 'EMS', 'Medicamentos', 'Pediátricos', '500mg/mL', 'Frasco 20ml', '1.0235.0934', 12.50, 8.20, 29, 8, '2025-12-05', 'L240805', 'EMS S/A', 'Analgésico e antitérmico infantil', 'Dor e febre em crianças', 'Menores de 3 meses', 'Conforme peso da criança', ARRAY['infantil', 'dor', 'febre', 'dipirona']),
    
    (farmacia_default_id, '7896422507890', 'Tylenol Bebê', 'Paracetamol', 'Paracetamol', 'Janssen', 'Medicamentos', 'Pediátricos', '160mg/mL', 'Frasco 15ml', '1.0573.0234', 18.90, 12.30, 26, 6, '2025-11-15', 'L240715', 'Janssen-Cilag', 'Paracetamol concentrado para bebês', 'Dor e febre', 'Menores de 3 meses', 'Conforme orientação médica', ARRAY['bebê', 'paracetamol', 'febre']),
    
    -- PRODUTOS PARA DIABETES
    (farmacia_default_id, '7891058007123', 'Metformina EMS', 'Metformina', 'Cloridrato de Metformina', 'EMS', 'Medicamentos', 'Antidiabéticos', '850mg', 'Caixa com 30 comprimidos', '1.0235.1045', 18.50, 12.10, 24, 5, '2025-10-20', 'L240520', 'EMS S/A', 'Antidiabético oral primeira linha', 'Diabetes tipo 2', 'Insuficiência renal', '1 comprimido 2x/dia', ARRAY['diabetes', 'metformina', 'glicemia']),
    
    -- CONTRACEPTIVOS
    (farmacia_default_id, '7896422508901', 'Yasmin Bayer', 'Drospirenona + Etinilestradiol', 'Drospirenona + Etinilestradiol', 'Bayer', 'Medicamentos', 'Contraceptivos', '3mg + 0,03mg', 'Cartela com 21 drágeas', '1.0987.0345', 42.90, 28.50, 18, 4, '2025-09-30', 'L240630', 'Bayer S.A.', 'Contraceptivo oral combinado', 'Contracepção', 'Tromboembolismo', '1 drágea/dia por 21 dias', ARRAY['contraceptivo', 'anticoncepcional', 'hormonal']);

    -- CONFIGURAÇÕES PADRÃO DA FARMÁCIA
    INSERT INTO configuracoes (farmacia_id, chave, valor, descricao, categoria) VALUES
    (farmacia_default_id, 'whatsapp_saudacao', '{"texto": "Olá! 👋 Bem-vindo à Farmácia São João! 💊\n\nSou seu assistente virtual e estou aqui para ajudar você com:\n🔍 Consultas de preços\n💊 Informações sobre medicamentos\n🛒 Pedidos e reservas\n📞 Contato com nosso farmacêutico\n\nO que posso fazer por você hoje?"}', 'Mensagem de saudação do WhatsApp', 'whatsapp'),
    
    (farmacia_default_id, 'horario_atendimento_bot', '{"inicio": "06:00", "fim": "23:00", "dias": ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"]}', 'Horário de funcionamento do bot', 'operacional'),
    
    (farmacia_default_id, 'frete_gratis_valor', '{"valor": 50.00}', 'Valor mínimo para frete grátis', 'vendas'),
    
    (farmacia_default_id, 'taxa_entrega_padrao', '{"valor": 5.00, "tempo_estimado": 30}', 'Taxa e tempo de entrega padrão', 'vendas'),
    
    (farmacia_default_id, 'desconto_fidelidade', '{"porcentagem": 5, "minimo_pontos": 100}', 'Desconto por fidelidade', 'fidelidade'),
    
    (farmacia_default_id, 'alerta_estoque_baixo', '{"ativo": true, "horario": "09:00", "destinatarios": ["11999999999"]}', 'Configuração de alertas de estoque', 'estoque');

    -- CLIENTES DE EXEMPLO
    INSERT INTO clientes (farmacia_id, telefone, nome, cpf, email, data_nascimento, endereco, preferencias, segmento, total_pedidos, total_gasto) VALUES
    (farmacia_default_id, '5511987654321', 'Maria Silva', '12345678901', 'maria.silva@email.com', '1985-03-15', '{"rua": "Rua das Palmeiras, 456", "bairro": "Vila Nova", "cidade": "São Paulo", "cep": "02345-678"}', '{"marca_preferida": "EMS", "generico": true}', 'fiel', 8, 245.80),
    
    (farmacia_default_id, '5511876543210', 'João Santos', '98765432109', 'joao.santos@email.com', '1978-11-22', '{"rua": "Av. Brasil, 1234", "bairro": "Centro", "cidade": "São Paulo", "cep": "01234-567"}', '{"comunicacao": "whatsapp", "promocoes": true}', 'vip', 15, 523.40),
    
    (farmacia_default_id, '5511765432109', 'Ana Costa', '45678912345', 'ana.costa@email.com', '1992-07-08', '{"rua": "Rua São José, 789", "bairro": "Jardim América", "cidade": "São Paulo", "cep": "03456-789"}', '{"entrega_preferida": "delivery"}', 'recorrente', 4, 128.90),
    
    (farmacia_default_id, '5511654321098', 'Carlos Oliveira', '78912345678', 'carlos.oliveira@email.com', '1965-12-03', '{"rua": "Rua das Flores, 321", "bairro": "Vila Madalena", "cidade": "São Paulo", "cep": "04567-890"}', '{"diabetes": true, "medicamento_continuo": ["Metformina"]}', 'vip', 22, 892.60),
    
    (farmacia_default_id, '5511543210987', 'Lucia Ferreira', '32165498712', 'lucia.ferreira@email.com', '1990-05-20', '{"rua": "Av. Paulista, 1500", "bairro": "Bela Vista", "cidade": "São Paulo", "cep": "01310-100"}', '{"bebe": true, "produtos_infantis": true}', 'novo', 1, 45.30);

    RAISE NOTICE 'Seeds de produtos, configurações e clientes inseridos com sucesso!';
END $$;