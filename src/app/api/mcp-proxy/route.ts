import { NextRequest, NextResponse } from 'next/server'

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar se é uma requisição MCP válida
    if (!body.method || !body.params) {
      return NextResponse.json(
        { error: 'Requisição MCP inválida. Campos obrigatórios: method, params' },
        { status: 400 }
      )
    }

    // Log da requisição (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 MCP Proxy Request:', {
        method: body.method,
        tool: body.params.name,
        timestamp: new Date().toISOString()
      })
    }

    // Fazer requisição para o MCP Server
    const mcpResponse = await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!mcpResponse.ok) {
      const errorText = await mcpResponse.text()
      console.error('Erro na resposta do MCP Server:', {
        status: mcpResponse.status,
        statusText: mcpResponse.statusText,
        body: errorText
      })
      
      return NextResponse.json(
        { 
          error: 'Erro no servidor MCP',
          details: {
            status: mcpResponse.status,
            message: mcpResponse.statusText
          }
        },
        { status: 502 }
      )
    }

    const mcpData = await mcpResponse.json()
    
    // Log da resposta (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ MCP Proxy Response:', {
        success: !mcpData.error,
        hasContent: !!mcpData.content,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json(mcpData)

  } catch (error) {
    console.error('Erro no proxy MCP:', error)
    
    // Diferentes tipos de erro
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: 'Servidor MCP indisponível',
          details: 'Verifique se o MCP Server está rodando na porta 3001'
        },
        { status: 503 }
      )
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { 
          error: 'Erro ao processar JSON',
          details: 'Dados da requisição ou resposta inválidos'
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Erro interno no proxy MCP',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Health check do MCP Server
    const mcpResponse = await fetch(`${MCP_SERVER_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!mcpResponse.ok) {
      return NextResponse.json(
        { 
          status: 'unhealthy',
          mcp_server: 'down',
          error: `MCP Server retornou ${mcpResponse.status}`
        },
        { status: 503 }
      )
    }

    const healthData = await mcpResponse.json()

    return NextResponse.json({
      status: 'healthy',
      mcp_server: 'up',
      proxy_version: '1.0.0',
      mcp_server_info: healthData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        mcp_server: 'unreachable',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}