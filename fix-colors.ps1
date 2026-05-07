$replacements = @{
    'from-pink-500' = 'from-blue-500'
    'to-pink-500' = 'to-blue-500'
    'from-pink-400' = 'from-blue-400'
    'to-pink-400' = 'to-blue-400'
    'text-pink-400' = 'text-blue-400'
    'text-pink-300' = 'text-blue-300'
    'hover:text-pink-400' = 'hover:text-blue-400'
    'hover:text-pink-300' = 'hover:text-blue-300'
    'bg-pink-500/10' = 'bg-blue-500/10'
    'bg-pink-500/15' = 'bg-blue-500/15'
    'bg-pink-500/20' = 'bg-blue-500/20'
    'bg-pink-500/5' = 'bg-blue-500/5'
    'ring-pink-500/30' = 'ring-blue-500/30'
    'ring-pink-500/50' = 'ring-blue-500/50'
    'ring-pink-500/20' = 'ring-blue-500/20'
    'accent-pink-500' = 'accent-blue-500'
    'from-pink-500/20' = 'from-blue-500/20'
    'to-purple-500/20' = 'to-blue-500/20'
    'to-purple-500' = 'to-blue-500'
    'to-purple-400' = 'to-blue-400'
}

$files = Get-ChildItem -Path src -Recurse -Filter *.tsx
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $original = $content
    foreach ($key in $replacements.Keys) {
        $content = $content.Replace($key, $replacements[$key])
    }
    if ($content -ne $original) {
        Set-Content $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "Modified: $($file.Name)"
    }
}