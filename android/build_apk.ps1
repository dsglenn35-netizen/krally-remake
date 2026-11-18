# 无 Gradle 的 APK 构建脚本（aapt2 + javac + d8 + zipalign + apksigner）
$ErrorActionPreference = 'Stop'
$ROOT = 'E:\Code\krally_remake'
$AND  = "$ROOT\android"
$SDK  = 'E:\Android\SDK'
$BT   = "$SDK\build-tools\36.0.0"
$PLAT = "$SDK\platforms\android-35\android.jar"
$JDK  = 'E:\Android\jdk21\jdk-21.0.13+9'
$env:JAVA_HOME = $JDK
$env:PATH = "$JDK\bin;$env:PATH"
$JAVAC= "$JDK\bin\javac.exe"
$KEYTOOL = "$JDK\bin\keytool.exe"
$BUILD= "$AND\build"

Write-Host "== 清理 =="
if (Test-Path $BUILD) { Remove-Item -Recurse -Force $BUILD }
New-Item -ItemType Directory -Force -Path "$BUILD\gen", "$BUILD\classes", "$BUILD\dex", "$AND\assets" | Out-Null

Write-Host "== 复制网页资源到 assets =="
$assets = "$AND\assets"
Get-ChildItem $assets -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item "$ROOT\index.html" $assets -Force
Copy-Item "$ROOT\style.css" $assets -Force
Copy-Item "$ROOT\js" $assets -Recurse -Force
Copy-Item "$ROOT\content" $assets -Recurse -Force

Write-Host "== 内联 JS（绕过 WebView 的 MIME 限制）=="
& 'D:\Program Files\Python\Python3.11.6\python.exe' "$AND\inline.py"

Write-Host "== aapt2 compile/link =="
& "$BT\aapt2.exe" compile --dir "$AND\res" -o "$BUILD\res.zip"
& "$BT\aapt2.exe" link -o "$BUILD\base.apk" -I $PLAT --manifest "$AND\AndroidManifest.xml" -A $assets --java "$BUILD\gen" --min-sdk-version 24 --target-sdk-version 35 "$BUILD\res.zip"
if ($LASTEXITCODE -ne 0) { throw "aapt2 link 失败" }

Write-Host "== javac =="
$srcs = @(Get-ChildItem "$AND\java" -Recurse -Filter *.java | ForEach-Object { $_.FullName })
$srcs += @(Get-ChildItem "$BUILD\gen" -Recurse -Filter *.java -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
& $JAVAC --release 17 -encoding UTF-8 -nowarn -classpath $PLAT -d "$BUILD\classes" @srcs
if ($LASTEXITCODE -ne 0) { throw "javac 失败" }

Write-Host "== d8 =="
$classes = @(Get-ChildItem "$BUILD\classes" -Recurse -Filter *.class | ForEach-Object { $_.FullName })
& "$BT\d8.bat" --release --min-api 24 --lib $PLAT --output "$BUILD\dex" @classes
if ($LASTEXITCODE -ne 0) { throw "d8 失败" }

Write-Host "== 打包 dex =="
Copy-Item "$BUILD\base.apk" "$BUILD\unsigned.apk" -Force
& "$JDK\bin\jar.exe" --update --file "$BUILD\unsigned.apk" -C "$BUILD\dex" classes.dex
if ($LASTEXITCODE -ne 0) { throw "加入 dex 失败" }

Write-Host "== zipalign =="
& "$BT\zipalign.exe" -f -p 4 "$BUILD\unsigned.apk" "$BUILD\aligned.apk"
if ($LASTEXITCODE -ne 0) { throw "zipalign 失败" }

Write-Host "== 签名 =="
$ks = "$AND\debug.keystore"
if (-not (Test-Path $ks)) {
  & $KEYTOOL -genkeypair -keystore $ks -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US" 2>&1 | Out-Null
}
& "$BT\apksigner.bat" sign --ks $ks --ks-pass pass:android --key-pass pass:android --out "$ROOT\KRallyRemake.apk" "$BUILD\aligned.apk"
if ($LASTEXITCODE -ne 0) { throw "apksigner 失败" }

& "$BT\apksigner.bat" verify --print-certs "$ROOT\KRallyRemake.apk" | Select-Object -First 4
$apk = Get-Item "$ROOT\KRallyRemake.apk"
Write-Host ("APK OK: " + $apk.FullName + "  " + [math]::Round($apk.Length/1MB,2) + " MB")
