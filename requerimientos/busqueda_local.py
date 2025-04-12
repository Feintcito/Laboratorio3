if __name__ == "__main__":
    red_local = "192.168.0.0/24"
    hosts_activos = descubrir_hosts(red_local)

    for ip_objetivo in hosts_activos:
        print(f"\n📡 Analizando: {ip_objetivo}")
        analisis = analizar_vulnerabilidades(ip_objetivo)
        
        for servicio, cves in analisis.items():
            print(f"\n🔎 {servicio}")
            if cves:
                for cve in cves:
                    print(f" - {cve['id']}: {cve['summary']}")
            else:
                print(" - Sin CVEs recientes.")

