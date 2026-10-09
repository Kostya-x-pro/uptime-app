#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [string]$BaseRef = '',
    [string]$Commit = 'HEAD',
    [switch]$All
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$failures = @()

function Invoke-Check {
    param(
        [Parameter(Mandatory)] [string]$Name,
        [Parameter(Mandatory)] [string]$Command,
        [Parameter(Mandatory)] [string[]]$Arguments,
        [Parameter(Mandatory)] [string]$WorkingDirectory
    )

    Write-Host "`n== $Name =="
    try {
        Push-Location $WorkingDirectory
        & $Command @Arguments
        $exitCode = $LASTEXITCODE
    }
    catch {
        $exitCode = 1
        Write-Warning $_
    }
    finally {
        Pop-Location
    }

    if ($exitCode -ne 0) {
        $script:failures += "$Name (exit code $exitCode)"
    }
}

if (-not $BaseRef) {
    $BaseRef = "$Commit^"
}

if ($All) {
    $changedFiles = @('backend/', 'frontend/')
}
else {
    $changedFiles = @(git -C $repoRoot diff --name-only "$BaseRef...$Commit")
    if ($LASTEXITCODE -ne 0) {
        throw "Cannot read changed files for $BaseRef...$Commit"
    }
}

$backendTouched = $All -or @($changedFiles | Where-Object { $_ -like 'backend/*' }).Count -gt 0
$frontendTouched = $All -or @($changedFiles | Where-Object { $_ -like 'frontend/*' }).Count -gt 0

if ($backendTouched) {
    $backendPath = Join-Path $repoRoot 'backend'
    $goFiles = @($changedFiles | Where-Object { $_ -match '^backend/.*\.go$' })
    if ($All) {
        $goFiles = @(Get-ChildItem (Join-Path $backendPath 'internal'), (Join-Path $backendPath 'cmd') -Recurse -Filter *.go | ForEach-Object { $_.FullName })
    }
    elseif ($goFiles.Count -gt 0) {
        $goFiles = @($goFiles | ForEach-Object { Join-Path $repoRoot $_ })
    }

    if ($goFiles.Count -gt 0) {
        Write-Host "`n== Go formatting =="
        $formatTemp = Join-Path ([IO.Path]::GetTempPath()) ("product-code-review-" + [guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $formatTemp | Out-Null
        try {
            $normalizedFiles = @()
            foreach ($sourceFile in $goFiles) {
                $relativePath = $sourceFile.Substring($repoRoot.Length).TrimStart('\', '/')
                $normalizedFile = Join-Path $formatTemp $relativePath
                New-Item -ItemType Directory -Force -Path (Split-Path $normalizedFile) | Out-Null
                $sourceText = [IO.File]::ReadAllText($sourceFile) -replace "`r`n", "`n"
                [IO.File]::WriteAllText($normalizedFile, $sourceText, (New-Object Text.UTF8Encoding($false)))
                $normalizedFiles += $normalizedFile
            }

            $formatOutput = @(gofmt -l $normalizedFiles)
            if ($LASTEXITCODE -ne 0 -or $formatOutput.Count -gt 0) {
                $script:failures += 'Go formatting (gofmt -l reported files)'
                $formatOutput | Write-Host
            }
        }
        finally {
            Remove-Item -Recurse -Force $formatTemp -ErrorAction SilentlyContinue
        }
    }

    Invoke-Check 'Go tests' 'go' @('test', './...') $backendPath
    Invoke-Check 'Go vet' 'go' @('vet', './...') $backendPath
}

if ($frontendTouched) {
    $frontendPath = Join-Path $repoRoot 'frontend'
    $npm = if (Get-Command npm.cmd -ErrorAction SilentlyContinue) { 'npm.cmd' } else { 'npm' }
    $tsc = if (Test-Path (Join-Path $frontendPath 'node_modules\.bin\tsc.cmd')) {
        Join-Path $frontendPath 'node_modules\.bin\tsc.cmd'
    }
    else {
        Join-Path $frontendPath 'node_modules/.bin/tsc'
    }

    Invoke-Check 'Next.js ESLint' $npm @('run', 'lint') $frontendPath
    Invoke-Check 'Next.js TypeScript' $tsc @('--noEmit') $frontendPath
    Invoke-Check 'Next.js production build' $npm @('run', 'build') $frontendPath
}

if (-not $backendTouched -and -not $frontendTouched) {
    Write-Host 'No backend or frontend files are included in the selected diff.'
}

if ($failures.Count -gt 0) {
    Write-Error ("Static checks failed:`n - " + ($failures -join "`n - "))
    exit 1
}

Write-Host "`nAll applicable static checks passed."
