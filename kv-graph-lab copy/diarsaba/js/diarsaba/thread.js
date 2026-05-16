  async function threads(e) {
            if (e.endsWith("~")) {
                const s = diarsaba.get(e);
                for (let e = 0; e < s.length; e++) threads(s[e]);
            } else if (e.endsWith("!")) {
                const s = diarsaba.get(e);
                if (s) {
                    const a = diarsaba.get(s[0]);

                    if (a) a.apply(null, s.slice(1));
                    else {
                        const a = `\n• Función buscada: "${s[0]
                            }"\n• Llamada desde: "${e}"\n• Parámetros esperados: [${s
                                .slice(1)
                                .map((e) => `"${e}"`)
                                .join(", ")}]\n  → ${e}\n     → ${s[0]} (NO ENCONTRADO)`.trim();
                        alert(a);
                    }
                } else {
                    const s = `• no exist "${e}"`.trim();
                    alert(s);
                }
            }
        }
