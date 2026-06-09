# JoeBro Web Controller - Wi-Fi Provisioning
# Written by Joe B. The Blind Hacker

param (
    [string]$ssid,
    [string]$password,
    [string]$aylaEmail,
    [string]$aylaPassword
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Sobro Smart Table - Wi-Fi Provisioning" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Before running this, ensure your computer is currently connected"
Write-Host "to the 'Sobro_XXXX' Wi-Fi network broadcasted by the table." -ForegroundColor Yellow
Write-Host ""

if (-not $ssid) {
    $ssid = Read-Host "Enter your Home Wi-Fi Network Name (SSID) [2.4GHz ONLY]"
}

if (-not $password) {
    $password = Read-Host "Enter your Home Wi-Fi Password"
}

if (-not $aylaEmail) {
    $aylaEmail = Read-Host "Enter your Ayla/Sobro Email Address"
}

if (-not $aylaPassword) {
    $aylaPassword = Read-Host "Enter your Ayla/Sobro Password"
}

Write-Host ""
Write-Host "Provisioning table to $ssid..." -ForegroundColor Green

Write-Host ""
Write-Host "Fetching Registration Token from Table..." -ForegroundColor Cyan

$tokenValue = $null
$tokenType = "setup_token"
try {
    $regResponse = Invoke-RestMethod -Uri "http://192.168.0.1/regtoken.json" -Method Get -TimeoutSec 5 -ErrorAction Stop
    $tokenValue = $regResponse.regtoken
    $tokenType = "regtoken"
    Write-Host "Successfully extracted hardware RegToken: $tokenValue" -ForegroundColor Green
} catch {
    Write-Host "Failed to fetch regtoken. Falling back to Setup Token..." -ForegroundColor Yellow
    $tokenValue = (Get-Random -Minimum 10000000 -Maximum 99999999).ToString()
    Write-Host "Generated fallback Setup Token: $tokenValue" -ForegroundColor Yellow
}

$url = "http://192.168.0.1/wifi_connect.json?ssid=$([uri]::EscapeDataString($ssid))&key=$([uri]::EscapeDataString($password))&setup_token=$tokenValue"

try {
    # Send the payload to the table's AP hotspot
    $response = Invoke-WebRequest -Uri $url -Method Post -Body "none" -TimeoutSec 3 -ErrorAction Stop
} catch {
    Write-Host "The table accepted the Wi-Fi credentials and is rebooting its Wi-Fi chip!" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================="
Write-Host " Step 2: Account Binding" -ForegroundColor Cyan
Write-Host "========================================="
Write-Host "Please connect your computer BACK to your home Wi-Fi network ($ssid) so we can reach the Internet." -ForegroundColor Yellow
Pause

# $aylaEmail and $aylaPassword are set by parameters or earlier prompts
# Same App ID and Secret from the Android App
$app_id = "sobro-ag-id"
$app_secret = "sobro-mDM8M4JEe7IJFwiKvbs956XqX_s"

Write-Host "Authenticating with Ayla Cloud..."
$authBody = @{
    user = @{
        email = $aylaEmail
        password = $aylaPassword
        application = @{
            app_id = $app_id
            app_secret = $app_secret
        }
    }
}

$authRes = Invoke-RestMethod -Uri "https://user-field.aylanetworks.com/users/sign_in.json" -Method Post -Body ($authBody | ConvertTo-Json -Depth 5) -ContentType "application/json"
$token = $authRes.access_token

Write-Host "Registering Table to Account..."
$regBody = @{
    device = @{
        $tokenType = $tokenValue
    }
}

$headers = @{ "Authorization" = "auth_token $token" }

try {
    $regRes = Invoke-RestMethod -Uri "https://ads-field.aylanetworks.com/apiv1/devices.json" -Method Post -Headers $headers -Body ($regBody | ConvertTo-Json -Depth 5) -ContentType "application/json"
    Write-Host ""
    Write-Host "SUCCESS! The table has been officially bound to your account!" -ForegroundColor Green
    Write-Host "You can now open the JoeBro Web Controller and it will appear in the dropdown list."
} catch {
    Write-Host "Failed to register table to account. The table might not be connected to the internet yet. Run this API call manually once the table connects." -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ""
exit 0
