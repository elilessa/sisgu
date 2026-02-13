$path = 'c:\Users\elile\OneDrive\Documentos\AntiGravity\SisGu\src'
$files = Get-ChildItem -Path $path -Filter *.tsx -Recurse
foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        if ($content -notmatch 'import React') {
            Write-Host "Fixing $($file.Name)"
            $newContent = "import React from 'react';" + [Environment]::NewLine + $content
            $newContent | Set-Content $file.FullName -Encoding UTF8
        }
    } catch {
        Write-Error "Failed to fix $($file.Name): $_"
    }
}
