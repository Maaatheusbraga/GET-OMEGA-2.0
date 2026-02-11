/**
 * GET OMEGA 2.0 - BACKEND API (ES MODULES)
 * Conexão direta com SRV-SISTEMA (SQL Server)
 * * SOLUÇÃO PARA ERRO DE CONVERSÃO:
 * 1. SET DATEFORMAT ymd: Força interpretação de strings ISO com traços.
 * 2. sql.VarChar: Evita problemas de Unicode/NVarChar.
 * 3. Mapeamento 1:1 com os parâmetros da Stored Procedure.
 */

import express from 'express';
import sql from 'mssql';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

// Configuração de acesso ao banco SPEDS
const dbConfig = {
    user: 'relatorio',
    password: 'relatorio123',
    server: 'SRV-SISTEMA', 
    database: 'speds',
    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    pool: { 
        max: 20, 
        min: 0, 
        idleTimeoutMillis: 30000 
    }
};

app.post('/api/generate-base', async (req, res) => {
    const { procedureId, params, userName, reg } = req.body;
    let pool;

    try {
        pool = await sql.connect(dbConfig);
        let request = pool.request();
        request.timeout = 0; // Importante para processos longos

        // Datas vêm do Front como 'YYYY-MM-DD'.
        const dtI = params.p_periodo_i || params.p_data_i || params.data_inicio;
        const dtF = params.p_periodo_f || params.p_data_f || params.data_fim;

        let procedureName = "";

        // --- MAPEAMENTO TÉCNICO RIGOROSO ---
        switch (procedureId) {
            case 'efd_fiscal':
                procedureName = "PROC_GERAR_EFD_FISCAL_GERADOR";
                request.input('p_cliente', sql.Int, parseInt(params.p_cliente));
                request.input('cnpj', sql.VarChar(20), (params.p_cnpj || params.cnpj)?.toString().trim()); 
                request.input('p_periodo_i', sql.VarChar(20), dtI);
                request.input('p_periodo_f', sql.VarChar(20), dtF);
                request.input('p_usuario', sql.VarChar(100), userName || 'Matheus');
                break;

            case 'efd_contribuicoes':
                procedureName = "PROC_GER_EFD_CONTR_GERADOR";
                request.input('P_CLIENTE', sql.Int, parseInt(params.p_cliente));
                request.input('P_CNPJ', sql.VarChar(20), params.p_cnpj?.toString());
                request.input('P_PERIODO_I', sql.VarChar(20), dtI);
                request.input('P_PERIODO_F', sql.VarChar(20), dtF);
                request.input('P_USUARIO', sql.VarChar(100), userName);
                break;

            case 'efd_bloco_m':
                procedureName = "PROC_REL_CONTRIBUICOES_BLOCO_M_GERADOR";
                request.input('p_cnpj', sql.VarChar(20), params.p_cnpj?.toString());
                request.input('p_periodo_i', sql.VarChar(20), dtI);
                request.input('p_periodo_f', sql.VarChar(20), dtF);
                request.input('p_usuario', sql.VarChar(100), userName);
                break;

            case 'resumo_entrada':
                procedureName = "PROC_RESUMO_NFE_ENTRADA_SPED_V2_GERADOR";
                request.input('p_cliente', sql.Int, parseInt(params.p_cliente));
                request.input('p_data_i', sql.VarChar(20), dtI);
                request.input('p_data_f', sql.VarChar(20), dtF);
                request.input('p_cnpj', sql.VarChar(20), params.p_cnpj?.toString());
                request.input('p_usuario', sql.VarChar(100), userName);
                break;

            case 'resumo_saida':
                procedureName = "PROC_RESUMO_NFE_SAIDA_SPED_GERADOR";
                request.input('p_cliente', sql.Int, parseInt(params.p_cliente));
                request.input('p_data_i', sql.VarChar(20), dtI);
                request.input('P_data_f', sql.VarChar(20), dtF); 
                request.input('p_usuario', sql.VarChar(100), userName);
                break;

            default:
                procedureName = null;
                break;
        }

        let visualData = [];

        if (procedureName) {
            console.log(`[SQL EXEC] Rodando: ${procedureName} para ${userName}`);
            
            // Força o formato de data ISO para a sessão atual para evitar erro de string
            await request.query("SET DATEFORMAT ymd");
            
            const result = await request.execute(procedureName);
            
            // Captura o último recordset (o SELECT final da sua procedure)
            if (result.recordsets && result.recordsets.length > 0) {
                visualData = result.recordsets[result.recordsets.length - 1]; 
            }
        }

        res.json({ success: true, data: visualData });

    } catch (err) {
        console.error("ERRO NO TERMINAL:", err.message);
        res.status(500).json({ success: false, error: "FALHA NO SQL SERVER: " + err.message });
    }
});

/**
 * CONSULTA DE CLIENTES
 */
app.get('/api/clientes', async (req, res) => {
    const { search } = req.query;
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('nome', sql.VarChar, `%${search}%`)
            .query("SELECT TOP 50 id_cliente, nome, cnpj FROM cliente with(nolock) WHERE nome LIKE @nome");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 API GET OMEGA 2.0 ONLINE: http://localhost:${PORT}`);
});