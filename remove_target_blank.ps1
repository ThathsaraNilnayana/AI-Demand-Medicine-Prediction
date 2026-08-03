$files = Get-ChildItem "c:\Users\User\Desktop\stitch" -Recurse -Filter "*.html"
foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName)
    if ($content.Contains('target="_blank"')) {
        $newContent = $content.Replace('target="_blank"', '')
        [System.IO.File]::WriteAllText($f.FullName, $newContent)
        Write-Host "Updated: $($f.FullName)"
    }
}
Write-Host "Done removing target=_blank!"
