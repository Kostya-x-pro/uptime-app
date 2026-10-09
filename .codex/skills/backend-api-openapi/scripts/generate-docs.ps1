#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [string]$BackendPath
)

$ErrorActionPreference = 'Stop'

if (-not $BackendPath) {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
    $BackendPath = Join-Path $repoRoot 'backend'
}

$BackendPath = (Resolve-Path $BackendPath).Path
$npxCommand = if (Get-Command npx.cmd -ErrorAction SilentlyContinue) { 'npx.cmd' } else { 'npx' }

Push-Location $BackendPath
try {
    & go run github.com/swaggo/swag/cmd/swag init -g cmd/server/main.go -o docs
    if ($LASTEXITCODE -ne 0) {
        throw "swag generation failed with exit code $LASTEXITCODE"
    }

    & $npxCommand --yes @redocly/cli build-docs docs/swagger.yaml --output docs/swagger.html --disableGoogleFont
    if ($LASTEXITCODE -ne 0) {
        throw "ReDoc generation failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}
