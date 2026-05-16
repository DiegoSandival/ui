  const diarsaba = new Map();


        window.addEventListener("DOMContentLoaded", async () => {


            diarsaba.set("on start", () => {



                window.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                });
                window.addEventListener("pointerup", (e) => {
                    diarsaba.set("pointer up event", e);
                    threads(`pointer up ${e.button} ~`);
                });
                window.addEventListener("wheel", (e) => {
                    //diarsaba.set("wheel event", e)
                    //threads(`wheel ~`)
                });
                window.addEventListener("pointerdown", (e) => {
                    diarsaba.set("pointer down event", e);
                    threads(`pointer down ${e.button} ~`);
                });
                window.addEventListener("pointermove", (e) => {
                    diarsaba.set("pointer move event", e);
                    diarsaba.set("pointer x", e.clientX);
                    diarsaba.set("pointer y", e.clientY);
                    //threads(`pointer move ~`)
                });

                window.addEventListener("keydown", (e) => {
                    // if is input no prevent default
                    if (
                        e.target.tagName === "INPUT" ||
                        e.target.tagName === "TEXTAREA" ||
                        e.target.isContentEditable
                    ) {
                    } else {
                        //e.preventDefault()
                    }

                    //threads(`key down ~`)
                    //threads(`key down ${e.key} ~`)
                });
            });

            diarsaba.set("pointer down 0 ~", []);
            diarsaba.set("pointer down 2 ~", []);
            diarsaba.set("pointer up 0 ~", ["handle click !"]);
            diarsaba.set("pointer up 2 ~", ["show context menu !"]);
            diarsaba.set("show context menu !", ["show context menu ƒ"]);
            diarsaba.set("atom name list", [
                "~ thread",
                "ƒ func",
                "! action",
                "$ num",
                "§ text",
                "# list",
            ]);

            diarsaba.set("list option ~ #", [
                "· * tomar",
                "· ~ abrir",
                "· * eliminar",
                "· * ocultar",
                "· ~ action",
            ]);
            diarsaba.set("list option ƒ #", [
                "· * tomar",
                "· * eliminar",
                "· ƒ editor",
                "· * ocultar",
            ]);
            diarsaba.set("list option ! #", [
                "· * tomar",
                "· ! abrir",
                "· * eliminar",
                "· * ocultar",
                "· ! action",
            ]);
            diarsaba.set("list option $ #", [
                "· * tomar",
                "· $ abrir",
                "· * eliminar",
                "· * ocultar",
            ]);
            diarsaba.set("list option § #", [
                "· * tomar",
                "· § abrir",
                "· * eliminar",
                "· § editor",
                "· § guardar",
                "· * ocultar",
            ]);
            diarsaba.set("list option # #", [
                "· * tomar",
                "· # abrir",
                "· * eliminar",
                "· * ocultar",
            ]);

            diarsaba.set("list option [] #", [
                "· []* ocultar",
                "· #* tomar",
                "· #* padre",
                "· #* abrir RAM",
                "· # despues",
                "· # antes",
                "· # eliminar",
            ]);
            diarsaba.set("list option ֎ #", [
                "· ֎* ocultar",
                "· ֎* padre",
                "· ֎ editar",
                "· ֎ guardar",
                "· ֎ editor",
            ]);
            diarsaba.set("list option ֎ $ #", [
                "· ֎* ocultar",
                "· ֎* padre",
                "· ֎ editar",
                "· ֎$ guardar",
                "· ֎ editor",
            ]);
            diarsaba.set("list option ֎ ƒ #", [
                "· ֎* ocultar",
                "· ֎* padre",
                "· ֎ editar",
                "· ֎ƒ guardar",
                "· ֎ editor",
            ]);
            diarsaba.set("list option ֎ § #", [
                "· ֎* ocultar",
                "· ֎* padre",
                "· ֎ editar",
                "· ֎§ guardar",
                "· ֎ editor",
            ]);

            diarsaba.set("types list #", ["~", "ƒ", "!", "$", "§", "#", "[]", "֎"]);

            diarsaba.set("handle click !", ["handle click ƒ"]);



            diarsaba.set("show context menu ƒ", () => {
                const event = diarsaba.get("pointer up event");

                if (event.target.nodeName === "HTML" || event.target.nodeName === "BODY") {
                    if (diarsaba.get("current menu")) {
                        diarsaba.get("current menu").remove();
                    }

                    diarsaba.set(
                        "current menu",
                        diarsaba.get("create list menu ƒ")(diarsaba.get("atom name list"))
                    );

                    diarsaba.set("open x $", event.clientX);
                    diarsaba.set("open y $", event.clientY);
                } else {
                    const type = event.target.textContent.slice(-1);
                    const name = event.target.textContent;

                    diarsaba.get("show options list ƒ")(type, name);
                }
            });

            diarsaba.set("show options list ƒ", (type, name) => {
                //~ ƒ ! $ § #

                if (diarsaba.get("current chip menu")) {
                    diarsaba.get("current chip menu").remove();
                }

                if (name.includes("[") && name.includes("]")) {
                    const event = diarsaba.get("pointer up event");
                    diarsaba.set(
                        "current chip menu",
                        diarsaba.get("create list menu ƒ")(
                            diarsaba.get(`list option [] #`),
                            event.target.parentElement.dataset.parent,
                            name
                        )
                    );
                } else if (diarsaba.get("types list #").includes(type)) {
                    const event = diarsaba.get("pointer up event");
                    diarsaba.set(
                        "current chip menu",
                        diarsaba.get("create list menu ƒ")(
                            diarsaba.get(`list option ${type} #`),
                            name
                        )
                    );
                } else {
                    const event = diarsaba.get("pointer up event");
                    type = "֎";
                    diarsaba.set(
                        "current chip menu",
                        diarsaba.get("create list menu ƒ")(
                            diarsaba.get(
                                `list option ${type} ${event.target.dataset.parent.slice(-1)} #`
                            ),
                            event.target.dataset.parent
                        )
                    );
                }
            });

            diarsaba.set("handle click ƒ", async () => {
                const event = diarsaba.get("pointer up event");

                if (event.target.nodeName === "HTML" || event.target.nodeName === "BODY") {
                    //podriamos ocultar todos los menus
                    diarsaba.get("clear menus ƒ")();
                } else {
                    const content = event.target.textContent;

                    if (diarsaba.get("atom name list").includes(content)) {
                        if (diarsaba.get("current menu")) {
                            diarsaba.get("current menu").remove();
                        }

                        const name = await diarsaba.get("modal input ƒ")(content.slice(0, 1));

                        if (name != null && name != "") {
                            diarsaba.get(`create ${event.target.textContent} ƒ`)(name);

                            const chip = diarsaba.get("create chip ƒ")(
                                diarsaba.get("open x $"),
                                diarsaba.get("open y $"),
                                name,
                                "",
                                content.slice(0, 1)
                            );
                            diarsaba.set(`${name} ֎`, chip);
                        }
                    } else if (name.includes("[") && name.includes("]")) {
                    } else {
                        //console.log(content, event.target.parentElement.dataset)
                        //console.log(content.slice(3))

                        const fun = diarsaba.get(`${content} ƒ`);
                        if (fun) {
                            diarsaba.get(`${content} ƒ`)(event.target.parentElement.dataset);
                            diarsaba.get("clear menus ƒ")();
                        } else {
                            //console.log("no exist")
                        }
                    }
                }
            });

            diarsaba.set("· []* ocultar ƒ", (dataset) => {
                diarsaba.get(`${dataset.parent} # ֎`).remove();
            });

            diarsaba.set("· #* padre ƒ", (dataset) => {
                const rect = diarsaba.get(`${dataset.parent} # ֎`).getBoundingClientRect();

                const chip = diarsaba.get("create chip ƒ")(
                    rect.right,
                    rect.top,
                    dataset.parent,
                    "",
                    dataset.parent.slice(0, 1)
                );

                const chip_rect = chip.getBoundingClientRect();

                chip.style.left = `${rect.left - (chip_rect.width + 10)}px`;
                diarsaba.set(`${dataset.parent} ֎`, chip);
            });

            diarsaba.set("· ֎* padre ƒ", (dataset) => {
                const rect = diarsaba.get(`${dataset.parent} ֎ ֎`).getBoundingClientRect();

                const chip = diarsaba.get("create chip ƒ")(
                    rect.right,
                    rect.top,
                    dataset.parent,
                    "",
                    dataset.parent.slice(0, 1)
                );

                const chip_rect = chip.getBoundingClientRect();

                chip.style.left = `${rect.left - (chip_rect.width + 10)}px`;
                diarsaba.set(`${dataset.parent} ֎`, chip);
            });



            diarsaba.set("· ! action ƒ", async (dataset) => {
                threads(`${dataset.parent}`);
            });
            diarsaba.set("· ~ action ƒ", async (dataset) => {
                threads(`${dataset.parent}`);
            });

            diarsaba.set("· ֎ editar ƒ", (dataset) => {
                diarsaba.get(`${dataset.parent} ֎ ֎`).contentEditable = true;
                diarsaba.get(`${dataset.parent} ֎ ֎`).focus();
            });

            diarsaba.set("· ƒ editor ƒ", async (dataset) => {
                var initial_code;

                if (diarsaba.get(dataset.parent) instanceof Function) {
                    initial_code = diarsaba.get(dataset.parent).toString();
                } else {
                    initial_code = "()=>{}";
                }

                const res = await window.codeEditor.open(
                    dataset.parent,
                    initial_code,
                    "js"
                );

                if (res != null && res != "") {
                    diarsaba.set(dataset.parent, createFunction(res));
                }
            });

            diarsaba.set("· § editor ƒ", async (dataset) => {
                const res = await window.codeEditor.open(
                    dataset.parent,
                    diarsaba.get(dataset.parent) || "",
                    "text"
                );

                if (res != null && res != "") {
                    diarsaba.set(dataset.parent, res);
                }
            });

            diarsaba.set("· ֎$ guardar ƒ", (dataset) => {
                diarsaba.get(`${dataset.parent} ֎ ֎`).contentEditable = false;
                diarsaba.set(
                    `${dataset.parent}`,
                    Number(diarsaba.get(`${dataset.parent} ֎ ֎`).textContent)
                );
            });
            diarsaba.set("· ֎ƒ guardar ƒ", (dataset) => {
                diarsaba.get(`${dataset.parent} ֎ ֎`).contentEditable = false;
                diarsaba.set(
                    `${dataset.parent}`,
                    createFunction(diarsaba.get(`${dataset.parent} ֎ ֎`).textContent)
                );
            });
            diarsaba.set("· ֎§ guardar ƒ", (dataset) => {
                diarsaba.get(`${dataset.parent} ֎ ֎`).contentEditable = false;
                diarsaba.set(
                    `${dataset.parent}`,
                    diarsaba.get(`${dataset.parent} ֎ ֎`).textContent
                );
            });

            diarsaba.set("· #* tomar ƒ", (dataset) => {
                const selection = diarsaba.get("obtener index [0] ƒ")(dataset.current);
                diarsaba.set("· * tomar §", selection.texto);
            });


            diarsaba.set("· # despues ƒ", (dataset) => {
                const tomado = diarsaba.get("· * tomar §");
                const selection = diarsaba.get("obtener index [0] ƒ")(dataset.current);
                diarsaba.get(dataset.parent).splice(selection.indice + 1, 0, tomado);

                diarsaba.get(`${dataset.parent} # ֎`).remove();
                diarsaba.get("· ~ abrir ƒ")(dataset);
            });

            diarsaba.set("· # antes ƒ", (dataset) => {
                const tomado = diarsaba.get("· * tomar §");
                const selection = diarsaba.get("obtener index [0] ƒ")(dataset.current);
                diarsaba.get(dataset.parent).splice(selection.indice, 0, tomado);

                diarsaba.get(`${dataset.parent} # ֎`).remove();
                diarsaba.get("· ~ abrir ƒ")(dataset);
            });
            diarsaba.set("· # eliminar ƒ", (dataset) => {
                const selection = diarsaba.get("obtener index [0] ƒ")(dataset.current);
                diarsaba.get(dataset.parent).splice(selection.indice, 1);

                diarsaba.get(`${dataset.parent} # ֎`).remove();
                diarsaba.get("· ~ abrir ƒ")(dataset);
            });

            diarsaba.set("· * eliminar ƒ", (dataset) => {
                diarsaba.get(`${dataset.parent} # ֎`).remove();
                diarsaba.get(`${dataset.parent} ֎`).remove();
                diarsaba.delete(dataset.parent);
                diarsaba.delete(`${dataset.parent} ֎`);
                diarsaba.delete(`${dataset.parent} # ֎`);
            });

            diarsaba.set("obtener index [0] ƒ", (texto) => {
                const regex = /^\[(\d+)\]\s*(.*)$/;
                const match = texto.match(regex);

                if (!match) {
                    throw new Error('Formato inválido. Se esperaba: "[número] texto"');
                }

                return {
                    indice: parseInt(match[1], 10),
                    texto: match[2].trim(),
                };
            });

            diarsaba.set("· * tomar ƒ", (dataset) => {
                diarsaba.set("· * tomar §", dataset.parent);
            });

            diarsaba.set("· ~ abrir ƒ", (dataset) => {
                const rect = diarsaba.get(`${dataset.parent} ֎`).getBoundingClientRect();
                const l_div = diarsaba.get("create list ƒ")(
                    rect.left + rect.width + 10,
                    rect.top,
                    diarsaba.get(dataset.parent),
                    dataset.parent
                );

                if (diarsaba.get(`${dataset.parent} # ֎`)) {
                    diarsaba.get(`${dataset.parent} # ֎`).remove();
                }

                diarsaba.set(`${dataset.parent} # ֎`, l_div);
            });
            //~ ƒ ! $ § #
            diarsaba.set("· $ abrir ƒ", (dataset) => {
                const rect = diarsaba.get(`${dataset.parent} ֎`).getBoundingClientRect();
                const chip = diarsaba.get("create chip ƒ")(
                    rect.left + rect.width + 10,
                    rect.top,
                    diarsaba.get(dataset.parent),
                    dataset.parent,
                    "$"
                );

                if (diarsaba.get(`${dataset.parent} ֎ ֎`)) {
                    diarsaba.get(`${dataset.parent} ֎ ֎`).remove();
                }

                diarsaba.set(`${dataset.parent} ֎ ֎`, chip);
            });
            diarsaba.set("· § abrir ƒ", (dataset) => {
                const rect = diarsaba.get(`${dataset.parent} ֎`).getBoundingClientRect();
                const chip = diarsaba.get("create chip ƒ")(
                    rect.left + rect.width + 10,
                    rect.top,
                    diarsaba.get(dataset.parent),
                    dataset.parent,
                    "§"
                );

                if (diarsaba.get(`${dataset.parent} ֎ ֎`)) {
                    diarsaba.get(`${dataset.parent} ֎ ֎`).remove();
                }

                diarsaba.set(`${dataset.parent} ֎ ֎`, chip);
            });
            diarsaba.set("· # abrir ƒ", (dataset) => {
                const rect = diarsaba.get(`${dataset.parent} ֎`).getBoundingClientRect();
                const l_div = diarsaba.get("create list ƒ")(
                    rect.left + rect.width + 10,
                    rect.top,
                    diarsaba.get(dataset.parent),
                    dataset.parent
                );

                if (diarsaba.get(`${dataset.parent} # ֎`)) {
                    diarsaba.get(`${dataset.parent} # ֎`).remove();
                }

                diarsaba.set(`${dataset.parent} # ֎`, l_div);
            });
            diarsaba.set("· ƒ abrir ƒ", (dataset) => {
                const rect = diarsaba.get(`${dataset.parent} ֎`).getBoundingClientRect();
                const chip = diarsaba.get("create chip ƒ")(
                    rect.left + rect.width + 10,
                    rect.top,
                    diarsaba.get(dataset.parent),
                    dataset.parent,
                    "ƒ"
                );

                if (diarsaba.get(`${dataset.parent} ֎ ֎`)) {
                    diarsaba.get(`${dataset.parent} ֎ ֎`).remove();
                }

                diarsaba.set(`${dataset.parent} ֎ ֎`, chip);
            });
            diarsaba.set("· ! abrir ƒ", (dataset) => {
                const rect = diarsaba.get(`${dataset.parent} ֎`).getBoundingClientRect();
                const l_div = diarsaba.get("create list ƒ")(
                    rect.left + rect.width + 10,
                    rect.top,
                    diarsaba.get(dataset.parent),
                    dataset.parent
                );

                if (diarsaba.get(`${dataset.parent} # ֎`)) {
                    diarsaba.get(`${dataset.parent} # ֎`).remove();
                }

                diarsaba.set(`${dataset.parent} # ֎`, l_div);
            });

            diarsaba.set("· * ocultar ƒ", (dataset) => {
                const chip = diarsaba.get(`${dataset.parent} ֎`);
                if (chip) {
                    diarsaba.get(`${dataset.parent} ֎`).remove();
                    diarsaba.delete(`${dataset.parent} ֎`);
                } else {
                    diarsaba.get(`${dataset.parent} ֎ ֎`).remove();
                    diarsaba.delete(`${dataset.parent} ֎ ֎`);
                }
            });

            diarsaba.set("· ֎* ocultar ƒ", (dataset) => {
                diarsaba.get(`${dataset.parent} ֎ ֎`).remove();
                diarsaba.delete(`${dataset.parent} ֎ ֎`);
            });

            diarsaba.set("eliminar elemento del dom ƒ", (dataset) => {
                diarsaba.get(`${dataset.parent} ֎`).remove();
            });

            diarsaba.set("create ~ thread ƒ", (name) => {
                if (!diarsaba.get(`${name}`)) diarsaba.set(`${name}`, []);
            });
            diarsaba.set("create ƒ func ƒ", (name) => {
                if (!diarsaba.get(`${name}`)) diarsaba.set(`${name}`, null);
            });
            diarsaba.set("create ! action ƒ", (name) => {
                if (!diarsaba.get(`${name}`)) diarsaba.set(`${name}`, []);
            });
            diarsaba.set("create $ num ƒ", (name) => {
                if (!diarsaba.get(`${name}`)) diarsaba.set(`${name}`, 0);
            });
            diarsaba.set("create § text ƒ", (name) => {
                if (!diarsaba.get(`${name}`)) diarsaba.set(`${name}`, "");
            });

            diarsaba.set("create # list ƒ", (name) => {
                if (!diarsaba.get(`${name}`)) diarsaba.set(`${name}`, []);
            });

            diarsaba.set("clear menus ƒ", () => {
                if (diarsaba.get("current menu")) {
                    diarsaba.get("current menu").remove();
                }

                if (diarsaba.get("current chip menu")) {
                    diarsaba.get("current chip menu").remove();
                }
            });

            diarsaba.set("modal input ƒ", async (pre) => {
                const createEl = (tag, props = {}) =>
                    Object.assign(document.createElement(tag), props);

                const div = createEl("div", { className: "modal-content" });
                const input = createEl("input", {
                    type: "text",
                    value: pre || "",
                    spellcheck: false,
                });

                const buttonContainer = createEl("div", { className: "modal-buttons" });

                ["Cancel", "Continue"].forEach((text) => {
                    const btn = createEl("button", { textContent: text });
                    btn.dataset.modal = text.toLowerCase();
                    btn.onclick = () => {
                        div.remove();
                        this.nombreInputPromise?.(
                            text === "Cancel" ? null : input.value.trim()
                        );
                    };
                    buttonContainer.append(btn);
                });

                div.append(input, buttonContainer);
                document.body.append(div);
                input.focus();

                return await new Promise((resolve) => (this.nombreInputPromise = resolve));
            });

            diarsaba.set("create list ƒ", (x, y, list, parent) => {
                const div = document.createElement("div");
                div.classList = "context-menu";

                if (list.length == 0) {
                    div.innerHTML += `<span class="menu-item">[0]</span>`;
                } else {
                    for (const key in list) {
                        div.innerHTML += `<span class="menu-item">[${key}] ${list[key]}</span>`;
                    }
                }

                div.style.left = `${x}px`;
                div.style.top = `${y}px`;
                div.dataset.parent = parent;
                document.body.appendChild(div);
                return div;
            });

            diarsaba.set("create list menu ƒ", (list, parent = "", current = "") => {
                const div = document.createElement("div");
                div.classList = "context-menu";
                for (const key of list) {
                    div.innerHTML += `<span class="menu-item">${key}</span>`;
                }
                div.style.left = `${diarsaba.get("pointer x")}px`;
                div.style.top = `${diarsaba.get("pointer y")}px`;

                div.dataset.parent = parent;
                div.dataset.current = current;
                document.body.appendChild(div);
                return div;
            });

            diarsaba.set("create chip ƒ", (x, y, text, parent = "", type = "") => {
                const div = document.createElement("div");
                div.classList = "object-name";
                div.textContent = text;
                div.style.left = `${x}px`;
                div.style.top = `${y}px`;
                div.spellcheck = false;
                div.dataset.parent = parent;
                div.dataset.type = type;
                document.body.appendChild(div);
                return div;
            });

            diarsaba.get("on start")();
        });