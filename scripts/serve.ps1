# Servidor HTTP de arquivos estáticos para módulos ES, sem instalar Python/Node.
# Compatível com Windows PowerShell 5.1. Encerrar com Ctrl+C.
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$listener = $null
foreach ($port in @(8765,8766,8767)) {
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
        $listener.Start()
        break
    } catch {
        $listener = $null
    }
}
if ($null -eq $listener) { Write-Host 'Nao foi possivel iniciar a porta local (8765-8767).'; exit 1 }
$url = "http://127.0.0.1:$port/"
Write-Host "MadrugaCraft 3D: $url"
Write-Host 'Mantenha esta janela aberta enquanto joga. Ctrl+C para encerrar.'
Start-Process $url
try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $client.ReceiveTimeout = 5000
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream,[System.Text.Encoding]::ASCII,$false,1024,$true)
            $firstLine = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($firstLine)) { continue }
            do { $header = $reader.ReadLine() } while ($null -ne $header -and $header.Length -gt 0)
            $parts = $firstLine.Split(' ')
            if ($parts.Length -lt 2 -or $parts[0] -notin @('GET','HEAD')) { continue }
            $path = $parts[1].Split('?')[0]
            $relative = [System.Uri]::UnescapeDataString($path).TrimStart('/')
            if ($relative -eq '') { $relative = 'index.html' }
            $relative = $relative.Replace('/',[System.IO.Path]::DirectorySeparatorChar)
            $candidate = [System.IO.Path]::GetFullPath((Join-Path $root $relative))
            $inside = $candidate.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar,[System.StringComparison]::OrdinalIgnoreCase)
            if (-not $inside -or -not [System.IO.File]::Exists($candidate)) {
                $status = '404 Not Found'
                $data = [System.Text.Encoding]::UTF8.GetBytes('Arquivo nao encontrado')
                $type = 'text/plain; charset=utf-8'
            } else {
                $status = '200 OK'
                $data = [System.IO.File]::ReadAllBytes($candidate)
                switch ([System.IO.Path]::GetExtension($candidate).ToLowerInvariant()) {
                    '.js' { $type = 'text/javascript; charset=utf-8' }
                    '.mjs' { $type = 'text/javascript; charset=utf-8' }
                    '.css' { $type = 'text/css; charset=utf-8' }
                    '.html' { $type = 'text/html; charset=utf-8' }
                    '.json' { $type = 'application/json; charset=utf-8' }
                    default { $type = 'application/octet-stream' }
                }
            }
            $headers = "HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $($data.Length)`r`nConnection: close`r`nX-Content-Type-Options: nosniff`r`n`r`n"
            $bytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
            $stream.Write($bytes,0,$bytes.Length)
            if ($parts[0] -eq 'GET') { $stream.Write($data,0,$data.Length) }
            $stream.Flush()
        } catch { Write-Host "Requisicao interrompida: $($_.Exception.Message)" }
        finally { $client.Close() }
    }
} finally { $listener.Stop() }
