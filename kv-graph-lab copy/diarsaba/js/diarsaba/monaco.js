
        // Configurar Monaco
        require.config({
            paths: { vs: "https://unpkg.com/monaco-editor@0.49.0/min/vs" },
        });

        // Usar un worker remoto
        window.MonacoEnvironment = {
            getWorkerUrl: function (workerId, label) {
                return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
                self.MonacoEnvironment = {
                    baseUrl: 'https://unpkg.com/monaco-editor@0.49.0/min/'
                };
                importScripts('https://unpkg.com/monaco-editor@0.49.0/min/vs/base/worker/workerMain.js');
            `)}`;
            },
        };

        // Clase para gestionar el editor
        class CodeEditor {
            constructor() {
                this.isMonacoLoaded = false;
                this.loadMonaco();

                // Definir los lenguajes disponibles
                this.languages = [
                    { id: 'html', name: 'HTML', icon: 'fab fa-html5', color: '#e34f26' },
                    { id: 'javascript', name: 'JavaScript', icon: 'fab fa-js-square', color: '#f7df1e' },
                    { id: 'css', name: 'CSS', icon: 'fab fa-css3-alt', color: '#1572b6' },
                    { id: 'python', name: 'Python', icon: 'fab fa-python', color: '#3776ab' },
                    { id: 'go', name: 'Go', icon: 'fab fa-golang', color: '#00add8' },
                    { id: 'plaintext', name: 'Texto', icon: 'fas fa-file-alt', color: '#666666' }
                ];

                // Mapeo de idiomas de Monaco
                this.languageMap = {
                    'html': 'html',
                    'javascript': 'javascript',
                    'css': 'css',
                    'python': 'python',
                    'go': 'go',
                    'text': 'plaintext'
                };
            }

            loadMonaco() {
                if (window.monaco) {
                    this.isMonacoLoaded = true;
                    return Promise.resolve();
                }

                return new Promise((resolve, reject) => {
                    require(["vs/editor/editor.main"], () => {
                        this.isMonacoLoaded = true;
                        resolve();
                    }, reject);
                });
            }

            async open(title = "Editor de Código", code = "", language = "javascript") {
                // Esperar a que Monaco esté cargado
                if (!this.isMonacoLoaded) {
                    await this.loadMonaco();
                }

                return new Promise((resolve) => {
                    // Encontrar el lenguaje inicial
                    const initialLang = this.languages.find(lang =>
                        this.languageMap[lang.id] === language || lang.id === language
                    ) || this.languages[1]; // Por defecto JavaScript

                    // Overlay y estructura principal
                    const overlay = Object.assign(document.createElement("div"), {
                        className: "editor-overlay",
                        innerHTML: `
        <div class="editor-modal">
            <div class="editor-header">
                <div class="editor-title">
                    <div class="language-selector">
                        <button class="language-button" type="button" title="Seleccionar lenguaje">
                            <i class="${initialLang.icon}" style="color: ${initialLang.color};"></i>
                            <span class="language-name">${initialLang.name}</span>
                        </button>
                        <div class="language-dropdown">
                            ${this.languages.map(lang => `
                                <button class="dropdown-item" data-lang="${lang.id}">
                                    <i class="${lang.icon}" style="color: ${lang.color};"></i>
                                    <span>${lang.name}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    <span class="modal-title">${title}</span>
                </div>
                <div class="editor-controls">
                    <button class="save-button" title="Guardar (Ctrl+S)">
                        <i class="fas fa-save"></i>
                    </button>
                    <button class="close-button" title="Cerrar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div id="monaco-container" style="width:100%;height:100%;"></div>
        </div>
    `,
                    });


                    document.body.appendChild(overlay);

                    // Variables para manejar el estado
                    let currentLanguage = initialLang.id;
                    let editorInstance = null;

                    // Crear editor
                    const createEditor = (langId) => {
                        const monacoLang = this.languageMap[langId] || langId;

                        monaco.editor.defineTheme("glass-dark", {
                            base: "vs-dark",
                            inherit: true,
                            rules: [],
                            colors: {
                                "editor.background": "#0b0b0b42",
                                "editorGutter.background": "#0b0b0b24",
                                "editorLineNumber.foreground": "#94a3b8",
                                "editorLineNumber.activeForeground": "#f8fafc",
                                "editorCursor.foreground": "#f8fafc",
                                "editor.selectionBackground": "#ffffff18",
                                "editor.inactiveSelectionBackground": "#ffffff10",
                                "editor.lineHighlightBackground": "#ffffff08",
                                "editor.lineHighlightBorder": "#00000000",
                                "editorIndentGuide.background1": "#ffffff12",
                                "editorIndentGuide.activeBackground1": "#ffffff22",
                                "focusBorder": "#00000000",
                                "contrastBorder": "#00000000",
                                "contrastActiveBorder": "#00000000",
                                "editorWidget.border": "#ffffff12",
                                "scrollbarSlider.background": "#ffffff14",
                                "scrollbarSlider.hoverBackground": "#ffffff24",
                                "scrollbarSlider.activeBackground": "#ffffff30"
                            }
                        });

                        if (editorInstance) {
                            editorInstance.dispose();
                        }

                        editorInstance = monaco.editor.create(
                            document.getElementById("monaco-container"),
                            {
                                value: code,
                                language: monacoLang,
                                theme: "glass-dark",
                                automaticLayout: true,
                                fontSize: 14,
                                fontFamily: "Fira Code, Consolas, monospace",
                                scrollBeyondLastLine: false,
                                minimap: { enabled: false },
                                lineNumbers: "on",
                                roundedSelection: false,
                                scrollbars: {
                                    vertical: "auto",
                                    horizontal: "auto",
                                },
                            }
                        );

                        return editorInstance;
                    };

                    // Inicializar editor
                    const editor = createEditor(currentLanguage);

                    // Referencias a elementos del DOM
                    const languageButton = overlay.querySelector('.language-button');
                    const languageIcon = languageButton.querySelector('i:first-child');
                    const languageName = languageButton.querySelector('.language-name');
                    const dropdown = overlay.querySelector('.language-dropdown');
                    const dropdownItems = overlay.querySelectorAll('.dropdown-item');

                    // Función para cambiar el lenguaje
                    const changeLanguage = (langId) => {
                        const newLang = this.languages.find(l => l.id === langId);
                        if (!newLang || currentLanguage === langId) return;

                        // Actualizar botón
                        languageIcon.className = newLang.icon;
                        languageIcon.style.color = newLang.color;
                        languageName.textContent = newLang.name;

                        // Actualizar lenguaje en el editor
                        const monacoLang = this.languageMap[langId] || langId;
                        monaco.editor.setModelLanguage(editor.getModel(), monacoLang);

                        currentLanguage = langId;
                        dropdown.classList.remove('show');
                    };

                    // Eventos
                    overlay
                        .querySelector(".save-button")
                        .addEventListener("click", () => closeEditor(editor.getValue()));

                    overlay
                        .querySelector(".close-button")
                        .addEventListener("click", () => closeEditor(""));

                    // Abrir/cerrar dropdown
                    languageButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        dropdown.classList.toggle('show');
                    });

                    // Seleccionar lenguaje del dropdown
                    dropdownItems.forEach(item => {
                        item.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const langId = item.dataset.lang;
                            changeLanguage(langId);
                        });
                    });

                    // Cerrar dropdown al hacer clic fuera
                    document.addEventListener('click', (e) => {
                        if (!languageButton.contains(e.target) && !dropdown.contains(e.target)) {
                            dropdown.classList.remove('show');
                        }
                    });

                    // Cerrar dropdown con Escape
                    document.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape' && dropdown.classList.contains('show')) {
                            dropdown.classList.remove('show');
                        }
                    });

                    // Función para cerrar el editor y resolver la promesa
                    const closeEditor = (result) => {
                        overlay.remove();
                        editor.dispose();
                        resolve(result);
                    };

                    // Atajos de teclado
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                        const newCode = editor.getValue();
                        closeEditor(newCode);
                    });

                    // Cerrar con Escape
                    editor.addCommand(monaco.KeyCode.Escape, () => {
                        if (!dropdown.classList.contains('show')) {
                            closeEditor("");
                        }
                    });

                    // Cerrar haciendo clic fuera del modal
                    overlay.addEventListener("click", (e) => {
                        if (e.target === overlay) {
                            closeEditor("");
                        }
                    });

                    editor.focus();
                });
            }
        }

        window.codeEditor = new CodeEditor();