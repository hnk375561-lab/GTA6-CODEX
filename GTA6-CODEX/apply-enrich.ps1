# Script PowerShell para enriquecer fichas de vehículos
# Uso: .\apply-enrich.ps1 -RepoPath "C:\dev\GTA6-CODEX\GTA6-CODEX\GTA6-CODEX\GTA6-CODEX"

param(
    [string]$RepoPath = (Get-Location).Path
)

$vehiculosDir = Join-Path $RepoPath "src\content\vehiculos"

if (-not (Test-Path $vehiculosDir)) {
    Write-Host "❌ Directorio no encontrado: $vehiculosDir" -ForegroundColor Red
    exit 1
}

$specEnhancements = @{
    'motor' = @{
        'sistemas_inyeccion' = 'Inyección directa'
        'tipo_valvulas' = 'DOHC - Doble árbol de levas'
        'ratio_compresion' = '10.5:1'
        'arbol_levas' = 'Variable (VVT)'
        'filtro_aire' = 'Filtro de aire de panel reemplazable'
    }
    'transmision' = @{
        'velocidades' = '8/9 velocidades (automática)'
        'tipo_automatico' = 'Convertidor de par'
        'control_cambios' = 'Secuencial/Modo deportivo'
        'sist_propulsion' = 'Tracción permanente (si aplica)'
    }
    'suspension' = @{
        'tipo_delantera' = 'MacPherson con barra estabilizadora'
        'tipo_trasera' = 'Multilink independiente'
        'recorrido_vertical' = '±150 mm (estimado)'
        'barra_estabilizadora' = 'Delante 26 mm / Atrás 20 mm'
        'amortiguadores' = 'De doble tubo con válvula ajustable'
    }
    'ruedas' = @{
        'pcd' = '5x114.3 / 5x120 (según modelo)'
        'offset' = '+35 a +45 mm'
        'indice_carga' = '91 (índice de carga)'
        'indice_velocidad' = 'T/V (hasta 190-240 km/h)'
        'profundidad_surcos' = '1.6 mm mínimo legal'
    }
    'direccion' = @{
        'tipo_asistencia' = 'Asistencia eléctrica progresiva'
        'angulo_max_giro' = '±32 a ±35°'
        'vueltas_calador' = '2.5 a 3.0 vueltas (360°)'
        'sistema_control' = 'Control electrónico de tracción'
    }
    'aerodinamica' = @{
        'coeficiente_arrastre' = 'Cx 0.27-0.32 (sedán)'
        'area_frontal' = '2.2-2.4 m² (estimado)'
        'spoiler_trasero' = 'Integrado en portón'
        'defectores_aire' = 'Canales de aire lateral bajo carrocería'
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
        'zonas_deformacion' = 'Delantera y trasera con absorción de energía'
        'cristales' = 'Laminado delantero, templado trasero'
        'cinturones_seguridad' = 'Pre-tensores y limitadores de carga'
        'respaldos_asientos' = 'Reforzados para protección trasera'
    }
    'climatizacion' = @{
        'control_temperatura' = 'Trizona (conductor/acompañante/trasero)'
        'desempañante_electrico' = 'Trasero y lateral'
        'filtro_polen' = 'Filtro de carbón activado'
        'modo_bajo_consumo' = 'Recirculación de aire automática'
    }
    'mantenimiento' = @{
        'revision_aceite' = 'Cada 15.000 km o 12 meses'
        'cambio_filtro_aire' = 'Cada 25.000-30.000 km'
        'revision_frenos' = 'Anual (grosor mín. 3 mm)'
        'cambio_refrigerante' = 'Cada 2 años / 40.000 km'
        'alineacion_ruedas' = 'Anual o si cambio de neumáticos'
    }
    'sistemas' = @{
        'asistencia_frenado_emergencia' = 'AEB con detección de peatones'
        'control_crucero_adaptativo' = 'ACC con stop & go'
        'monitoreo_punto_ciego' = 'BSM con detección de vehículos traseros'
        'aviso_salida_carril' = 'LDW con corrección de trayectoria'
        'sensores_parking' = '8-12 sensores ultrasónicos delante/atrás'
    }
}

$archivos = Get-ChildItem -Path $vehiculosDir -Filter "*.json" | Select-Object -ExpandProperty Name
Write-Host "📦 Encontrados $($archivos.Count) vehículos" -ForegroundColor Cyan

$procesados = 0
$errores = 0

foreach ($archivo in $archivos) {
    try {
        $rutaArchivo = Join-Path $vehiculosDir $archivo
        $contenido = Get-Content -Path $rutaArchivo -Raw
        $vehiculo = $contenido | ConvertFrom-Json

        # Agregar especificaciones si no existen
        if (-not $vehiculo.especificacionesMotor) {
            $vehiculo | Add-Member -NotePropertyName "especificacionesMotor" -NotePropertyValue $specEnhancements['motor']
        }
        if (-not $vehiculo.especificacionesTransmision) {
            $vehiculo | Add-Member -NotePropertyName "especificacionesTransmision" -NotePropertyValue $specEnhancements['transmision']
        }
        if (-not $vehiculo.especificacionesSuspension) {
            $vehiculo | Add-Member -NotePropertyName "especificacionesSuspension" -NotePropertyValue $specEnhancements['suspension']
        }
        if (-not $vehiculo.especificacionesRuedas) {
            $vehiculo | Add-Member -NotePropertyName "especificacionesRuedas" -NotePropertyValue $specEnhancements['ruedas']
        }
        if (-not $vehiculo.especificacionesDireccion) {
            $vehiculo | Add-Member -NotePropertyName "especificacionesDireccion" -NotePropertyValue $specEnhancements['direccion']
        }
        if (-not $vehiculo.aerodinámica) {
            $vehiculo | Add-Member -NotePropertyName "aerodinámica" -NotePropertyValue $specEnhancements['aerodinamica']
        }
        if (-not $vehiculo.capacidadesAdicionales) {
            $vehiculo | Add-Member -NotePropertyName "capacidadesAdicionales" -NotePropertyValue $specEnhancements['capacidades']
        }
        if (-not $vehiculo.seguridad_pasiva) {
            $vehiculo | Add-Member -NotePropertyName "seguridad_pasiva" -NotePropertyValue $specEnhancements['seguridad_pasiva']
        }
        if (-not $vehiculo.climatizacionAvanzada) {
            $vehiculo | Add-Member -NotePropertyName "climatizacionAvanzada" -NotePropertyValue $specEnhancements['climatizacion']
        }
        if (-not $vehiculo.mantenimientoPrograma) {
            $vehiculo | Add-Member -NotePropertyName "mantenimientoPrograma" -NotePropertyValue $specEnhancements['mantenimiento']
        }
        if (-not $vehiculo.sistemasInteligentes) {
            $vehiculo | Add-Member -NotePropertyName "sistemasInteligentes" -NotePropertyValue $specEnhancements['sistemas']
        }

        # Actualizar timestamp
        $vehiculo.updatedAt = (Get-Date -AsUTC -Format 'o')

        # Guardar con formato JSON bonito
        $jsonFormato = $vehiculo | ConvertTo-Json -Depth 100
        Set-Content -Path $rutaArchivo -Value $jsonFormato -Encoding UTF8

        $procesados++
        if ($procesados % 50 -eq 0) {
            Write-Host "✅ Procesados $procesados/$($archivos.Count)" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "❌ Error en $archivo : $_" -ForegroundColor Red
        $errores++
    }
}

Write-Host "`n🎉 Proceso completado:" -ForegroundColor Green
Write-Host "   ✅ $procesados vehículos enriquecidos" -ForegroundColor Green
Write-Host "   ⚠️  $errores errores" -ForegroundColor Yellow
