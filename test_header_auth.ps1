Write-Host "=== Testing Multiple Registrations on Localhost ==="
for ($i = 1; $i -le 3; $i++) {
    $email = "loopuser_$i`_" + (Get-Random) + "@example.com"
    $regBody = @{
        full_name = "Alex Loop $i"
        email = $email
        password = "Password123!"
        organization = "Header Lab"
        role = "Developer"
    } | ConvertTo-Json

    $regRes = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/user/register" -Method Post -ContentType "application/json" -Body $regBody
    Write-Host "Registration $i status:" $regRes.message "Success:" $regRes.success
}
