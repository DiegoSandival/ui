function createFunction(functionString) {
            const n = functionString.trim(),
                t = [
                    /^async\s*\(([^)]*)\)\s*=>\s*\{([\s\S]*)\}$/,
                    /^async\s*\(([^)]*)\)\s*=>\s*([^{].*)$/,
                    /^async\s+function[^(]*\(([^)]*)\)\s*\{([\s\S]*)\}$/,
                    /^async\s+function\s*\(([^)]*)\)\s*\{([\s\S]*)\}$/,
                    /^\(([^)]*)\)\s*=>\s*\{([\s\S]*)\}$/,
                    /^\(([^)]*)\)\s*=>\s*([^{].*)$/,
                    /^function[^(]*\(([^)]*)\)\s*\{([\s\S]*)\}$/,
                    /^function\s*\(([^)]*)\)\s*\{([\s\S]*)\}$/,
                ];
            for (const s of t) {
                const t = n.match(s);
                if (t) {
                    const n = t[1]
                        .split(",")
                        .map((n) => n.trim())
                        .filter((n) => n);
                    let i = t[2];
                    const c = s.toString().includes("async");
                    (!s.toString().includes("=>[^{]") &&
                        !s.toString().includes("async.*=>[^{]")) ||
                        i.trim().startsWith("return") ||
                        (i = `return ${i}`);
                    let r = null;
                    if (c) {
                        const t = `\n        return (async function(${n.join(
                            ", "
                        )}) {\n            ${i}\n        }).apply(this, arguments);\n    `;
                        r = new Function(...n, t);
                    } else r = new Function(...n, i);
                    const o = (...n) => r.apply(this, n);
                    return (
                        Object.defineProperty(o, "toString", {
                            value: () => functionString.trim(),
                            writable: !1,
                            configurable: !0,
                        }),
                        o
                    );
                }
            }
            throw new Error(`No se pudo parsear la función: ${functionString}`);
        }