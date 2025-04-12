def analizar_vulnerabilidades(ip):
    resultados = {}
    servicios = escanear_servicios(ip)
    for servicio in servicios:
        nombre = servicio["servicio"]
        version = servicio["version"]
        cves = buscar_cves(nombre, version)
        resultados[f"{nombre} ({version})"] = cves
    return resultados

