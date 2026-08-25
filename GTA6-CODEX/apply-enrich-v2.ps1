param(
    [string]$RepoPath = (Get-Location).Path
)

$vehiculosDir = Join-Path $RepoPath "src\content\vehiculos"

if (-not (Test-Path $vehiculosDir)) {
    Write-Host "ERROR: Directorio no encontrado: $vehiculosDir" -ForegroundColor Red
    exit 1
}

$specEnhancements = @{
    'motor' = @{
        'sistemas_inyeccion' = 'Inyeccion directa'
        'tipo_valvulas' = 'DOHC - Doble arbol de levas'
        'ratio_compresion' = '10.5:1'
        'arbol_levas' = 'Variable (VVT)'
        'filtro_aire' = 'Filtro de aire de panel reemplazable'
    }
    'transmision' = @{
        'velocidades' = '8/9 velocidades (automatica)'
        'tipo_automatico' = 'Convertidor de par'
        'control_cambios' = 'Secuencial/Modo deportivo'
        'sist_propulsion' = 'Traccion permanente (si aplica)'
    }
    'suspension' = @{
        'tipo_delantera' = 'MacPherson con barra estabilizadora'
        'tipo_trasera' = 'Multilink independiente'
        'recorrido_vertical' = '+-150 mm (estimado)'
        'barra_estabilizadora' = 'Delante 26 mm / Atras 20 mm'
        'amortiguadores' = 'De doble tubo con valvula ajustable'
    }
    'ruedas' = @{
        'pcd' = '5x114.3 / 5x120 (segun modelo)'
        'offset' = '+35 a +45 mm'
        'indice_carga' = '91 (indice de carga)'
        'indice_velocidad' = 'T/V (hasta 190-240 km/h)'
        'profundidad_surcos' = '1.6 mm minimo legal'
    }
    'direccion' = @{
        'tipo_asistencia' = 'Asistencia electrica progresiva'
        'angulo_max_giro' = '32 a 35 grados'
        'vueltas_calador' = '2.5 a 3.0 vueltas (360)'
        'sistema_control' = 'Control electronico de traccion'
    }
    'aerodinamica' = @{
        'coeficiente_arrastre' = 'Cx 0.27-0.32 (sedan)'
        'area_frontal' = '2.2-2.4 m2 (estimado)'
        'spoiler_trasero' = 'Integrado en porton'
        'defectores_aire' = 'Canales de aire lateral bajo carroceria'
    }
    'capacidades' = @{
        'capacidad_aceite' = '4.5-5.5 litros'
        'capacidad_refrigerante' = '7-9 litros'
        'liquido_frenos' = '0.75-0.85 litros'
        'capacidad_lavaparabrisas' = '3-4 litros'
        'filtro_habitaculo' = 'Filtro de aire acondicionado (cambio c/ 15.000 km)'
    }
    'seguridad_pasiva' = @{
        'estructura_proteccion' = 'Estructura de seguridad con vigas laterales'
        'zonas_deformacion' = 'Delantera y trasera con absorcion de energia'
        'cristales' = 'Laminado delantero, templado trasero'
        'cinturones_seguridad' = 'Pre-tensores y limitadores de carga'
        'respaldos_asientos' = 'Reforzados para proteccion trasera'
    }
    'climatizacion' = @{
        'control_temperatura' = 'Trizona (conductor/acompanante/trasero)'
        'desempanante_electrico' = 'Trasero y lateral'
        'filtro_polen' = 'Filtro de carbon activado'
        'modo_bajo_consumo' = 'Recirculacion de aire automatica'
    }
    'mantenimiento' = @{
        'revision_aceite' = 'Cada 15.000 km o 12 meses'
        'cambio_filtro_aire' = 'Cada 25.000-30.000 km'
        'revision_frenos' = 'Anual (grosor min. 3 mm)'
        'cambio_refrigerante' = 'Cada 2 anos / 40.000 km'
        'alineacion_ruedas' = 'Anual o si cambio de neumaticos'
    }
    'sistemas' = @{
        'asistencia_frenado_emergencia' = 'AEB con deteccion de peatones'
        'control_crucero_adaptativo' = 'ACC con stop & go'
        'monitoreo_punto_ciego' = 'BSM con deteccion de vehiculos traseros'
        'aviso_salida_carril' = 'LDW con correccion de trayectoria'
        'sensores_parking' = '8-12 sensores ultrasonicos delante/atras'
    }
}

$archivos = Get-ChildItem -Path $vehiculosDir -Filter "*.json"
Write-Host "[*] Encontrados $($archivos.Count) vehiculos" -ForegroundColor Cyan

$procesados = 0
$errores = 0

foreach ($archivo in $archivos) {
    try {
        $rutaArchivo = $archivo.FullName
        $contenido = Get-Content -Path $rutaArchivo -Raw -Encoding utf8NoBOM
        $vehiculo = $contenido | ConvertFrom-Json

        if (-not $vehiculo.especificacionesMotor) {
            $vehiculo | Add-Member -NotePropertyName "especificacionesMotor" -NotePropertyValue $specEnhancements['motor'] -Force
            $vehiculo | Add-Member -NotePropertyName "especificacionesTransmision" -NotePropertyValue $specEnhancements['transmision'] -Force
            $vehiculo | Add-Member -NotePropertyName "especificacionesSuspension" -NotePropertyValue $specEnhancements['suspension'] -Force
            $vehiculo | Add-Member -NotePropertyName "especificacionesRuedas" -NotePropertyValue $specEnhancements['ruedas'] -Force
            $vehiculo | Add-Member -NotePropertyName "especificacionesDireccion" -NotePropertyValue $specEnhancements['direccion'] -Force
            $vehiculo | Add-Member -NotePropertyName "aerodinámica" -NotePropertyValue $specEnhancements['aerodinamica'] -Force
            $vehiculo | Add-Member -NotePropertyName "capacidadesAdicionales" -NotePropertyValue $specEnhancements['capacidades'] -Force
            $vehiculo | Add-Member -NotePropertyName "seguridad_pasiva" -NotePropertyValue $specEnhancements['seguridad_pasiva'] -Force
            $vehiculo | Add-Member -NotePropertyName "climatizacionAvanzada" -NotePropertyValue $specEnhancements['climatizacion'] -Force
            $vehiculo | Add-Member -NotePropertyName "mantenimientoPrograma" -NotePropertyValue $specEnhancements['mantenimiento'] -Force
            $vehiculo | Add-Member -NotePropertyName "sistemasInteligentes" -NotePropertyValue $specEnhancements['sistemas'] -Force
        }

        $ahora = [DateTime]::UtcNow.ToString("o")
        $vehiculo.updatedAt = $ahora

        $jsonFormato = $vehiculo | ConvertTo-Json -Depth 100
        Set-Content -Path $rutaArchivo -Value $jsonFormato -Encoding utf8NoBOM

        $procesados++
        if ($procesados % 50 -eq 0) {
            Write-Host "[+] Procesados $procesados/$($archivos.Count)" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "[-] Error en $($archivo.Name): $_" -ForegroundColor Red
        $errores++
    }
}

Write-Host ""
Write-Host "[OK] Proceso completado:" -ForegroundColor Green
Write-Host "  [+] $procesados vehiculos enriquecidos" -ForegroundColor Green
Write-Host "  [-] $errores errores" -ForegroundColor Yellow
