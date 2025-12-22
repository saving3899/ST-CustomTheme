// ST-CustomTheme Extension

const extensionName = 'stCustomTheme';
const defaultSettings = {
    enabled: true,
    modernSidebar: true,
    fontSettingsEnabled: true,
    uiFont: '',
    uiFontSize: '',
    uiFontWeight: '',
    uiLineHeight: '',
    inputFont: '',
    inputFontSize: '',
    inputFontWeight: '',
    inputLineHeight: '',
    inputFontInherit: true,
    inputFontSizeInherit: true,
    inputFontWeightInherit: true,
    inputLineHeightInherit: true,
    chatFont: '',
    chatFontSize: '',
    chatFontWeight: '',
    chatLineHeight: '',
    mesTextFontInherit: true,
    mesTextFont: '',
    mesTextFontSizeInherit: true,
    mesTextFontSize: '',
    mesTextFontWeightInherit: true,
    mesTextFontWeight: '',
    mesTextLineHeightInherit: true,
    mesTextLineHeight: '',
    customFonts: [],
    darkMode: false,
    hoverColor: '#9aa894',
    hiddenButtons: [],
    sendTextareaPlaceholder: '',
    preventClickOutsideClose: false,
    // PC/모바일 분리 설정
    menuLayoutStylePC: 'sidebar',
    menuLayoutStyleMobile: 'hamburger',
    menuIconPack: 'default', // 'default', 'dessert', etc.
    customFavicon: '', // Base64 string
    customWebAppIcon: '', // Base64 string
    customTabTitle: '', // Custom Browser Tab Title
    customWebAppName: '', // Custom Web App Name (for manifest)
    webAppNameSameAsTab: false, // Use tab title as web app name
    personaExportEnabled: false, // Persona PNG Export/Import feature
    hiddenExtensionItems: [], // List of hidden extension menu items (by text)
    spellcheckEnabled: false, // Spellcheck for #send_textarea (Default: Enabled, Toggle: Disable)
    alwaysShowExtraButtons: false, // 9-1. Extract Message Action Buttons
    showDeleteButton: false // Message Delete Button
};

// 설정 객체 참조 (초기화 후 SillyTavern.getContext().extensionSettings에서 가져옴)
let stCustomThemeSettings = { ...defaultSettings };

// 화면 크기 판별 함수
function isMobileView() {
    return window.innerWidth <= 768;
}

// Menu Icon Pack Definitions
const MENU_ICON_PACKS = {
    default: {
        name: '기본',
        icons: {} // Empty means no overrides
    },
    dessert: {
        name: '디저트',
        icons: {
            '#leftNavDrawerIcon': { code: '\\f564', preview: 'fa-solid fa-cookie-bite' },
            '#API-status-top': { code: '\\f810', preview: 'fa-solid fa-ice-cream' },
            '#advanced-formatting-button .drawer-icon': { code: '\\f1fd', preview: 'fa-solid fa-cake-candles' },
            '#WIDrawerIcon': { code: '\\f786', preview: 'fa-solid fa-candy-cane' },
            '#user-settings-button .drawer-icon': { code: '\\f563', preview: 'fa-solid fa-cookie' },
            '#backgrounds-button .drawer-icon': { code: '\\f7b6', preview: 'fa-solid fa-mug-hot' },
            '#extensions-settings-button .drawer-icon': { code: '\\f06b', preview: 'fa-solid fa-gift' },
            '#persona-management-button .drawer-icon': { code: '\\f094', preview: 'fa-solid fa-lemon' },
            '#rightNavDrawerIcon': { code: '\\f5d1', preview: 'fa-solid fa-apple-whole' },
            '#table_database_settings_drawer .drawer-icon': { code: '\\f7ef', preview: 'fa-solid fa-cheese' }
        }
    }
};

// Track current applied pack to avoid re-applying
let currentAppliedIconPack = null;

// Apply Menu Icon Pack using CSS injection
function applyMenuIconPack(packName) {
    // Skip if already applied
    if (currentAppliedIconPack === packName) {
        return;
    }

    const pack = MENU_ICON_PACKS[packName];
    if (!pack) {
        console.warn('ST-CustomTheme: Unknown icon pack:', packName);
        return;
    }

    // Remove existing icon pack style
    $('#st-icon-pack-css').remove();

    // If default, just remove custom styles (original icons restored automatically)
    if (packName === 'default' || !pack.icons || Object.keys(pack.icons).length === 0) {
        currentAppliedIconPack = packName;

        return;
    }

    // Generate CSS rules for icon overrides
    let cssRules = '';

    // Map selector to drawer ID for hamburger dropdown support
    const selectorToDrawerId = {
        '#leftNavDrawerIcon': 'ai-config-button',
        '#API-status-top': 'sys-settings-button',
        '#advanced-formatting-button .drawer-icon': 'advanced-formatting-button',
        '#WIDrawerIcon': 'WI-SP-button',
        '#user-settings-button .drawer-icon': 'user-settings-button',
        '#backgrounds-button .drawer-icon': 'backgrounds-button',
        '#extensions-settings-button .drawer-icon': 'extensions-settings-button',
        '#persona-management-button .drawer-icon': 'persona-management-button',
        '#rightNavDrawerIcon': 'rightNavHolder',
        '#table_database_settings_drawer .drawer-icon': 'table_database_settings_drawer'
    };

    Object.entries(pack.icons).forEach(([selector, iconData]) => {
        // Original selector rules
        cssRules += `
            body.st-custom-theme-active ${selector}::before,
            body ${selector}::before {
                content: "${iconData.code}" !important;
                font-family: "Font Awesome 6 Free" !important;
                font-weight: 900 !important;
                font-size: unset !important;
            }
        `;

        // Hamburger dropdown item rules
        const drawerId = selectorToDrawerId[selector];
        if (drawerId) {
            cssRules += `
                .st-dropdown-item[data-drawer-id="${drawerId}"] i::before {
                    content: "${iconData.code}" !important;
                    font-family: "Font Awesome 6 Free" !important;
                    font-weight: 900 !important;
                }
            `;
        }
    });

    // Inject the style element
    const styleEl = $('<style id="st-icon-pack-css"></style>');
    styleEl.text(cssRules);
    $('head').append(styleEl);

    currentAppliedIconPack = packName;

}

// SillyTavern context에서 설정 초기화
function initSettings() {
    let shouldSave = false;

    // SillyTavern.getContext()가 존재하는지 확인
    if (typeof SillyTavern === 'undefined' || !SillyTavern.getContext) {
        console.warn('ST-CustomTheme: SillyTavern.getContext not available. Using default settings (Local storage disabled).');
        stCustomThemeSettings = { ...defaultSettings };
        return;
    }

    const context = SillyTavern.getContext();

    // Migration: Check if we have legacy localStorage data but no server data
    if (!context.extensionSettings[extensionName]) {
        const cached = localStorage.getItem('st_custom_theme_settings');
        if (cached) {
            console.info('ST-CustomTheme: Migrating settings from localStorage to server...');
            try {
                const parsed = JSON.parse(cached);
                context.extensionSettings[extensionName] = { ...defaultSettings, ...parsed };
                shouldSave = true;
                // Clear legacy storage after successful migration prep
                localStorage.removeItem('st_custom_theme_settings');
            } catch (e) {
                console.error('ST-CustomTheme: Migration failed', e);
                context.extensionSettings[extensionName] = structuredClone(defaultSettings);
                shouldSave = true;
            }
        } else {
            // New user or clean slate
            context.extensionSettings[extensionName] = structuredClone(defaultSettings);
            shouldSave = true;
        }
    } else {
        // Just cleanup legacy storage if it exists (to enforce "no local storage" rule active now)
        if (localStorage.getItem('st_custom_theme_settings')) {
            localStorage.removeItem('st_custom_theme_settings');
        }
    }

    // 누락된 키들 기본값으로 채우기
    for (const key of Object.keys(defaultSettings)) {
        if (!Object.hasOwn(context.extensionSettings[extensionName], key)) {
            context.extensionSettings[extensionName][key] = structuredClone(defaultSettings[key]);
            shouldSave = true;
        }
    }

    // 설정 참조 업데이트
    stCustomThemeSettings = context.extensionSettings[extensionName];

    if (shouldSave) {
        context.saveSettingsDebounced();
    }
}

// 설정 저장
function saveSettings() {
    if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
        const context = SillyTavern.getContext();
        context.extensionSettings[extensionName] = stCustomThemeSettings;
        context.saveSettingsDebounced();
    } else {
        console.warn('ST-CustomTheme: Cannot save settings (SillyTavern context missing).');
    }
    // applyDynamicStyles가 정의되어 있으면 호출
    if (typeof window.applyDynamicStyles === 'function') {
        window.applyDynamicStyles();
        if (typeof verifyDeleteButtons === 'function') verifyDeleteButtons();
    }
}

// Flash prevention using localStorage REMOVED as per user request to disable local storage.

jQuery(async () => {
    // 1. Initialize Settings
    initSettings();
    // Cache for localStorage fallback REMOVED

    // Load persona-export.js module dynamically
    // Get current script's directory path for relative loading
    const currentScript = document.querySelector('script[src*="ST-CustomTheme/index.js"]');
    let basePath = '';
    if (currentScript) {
        const src = currentScript.src;
        basePath = src.substring(0, src.lastIndexOf('/') + 1);
    } else {
        // Fallback: try known extension path patterns
        basePath = 'scripts/extensions/third-party/ST-CustomTheme/';
    }

    const script = document.createElement('script');
    script.src = `${basePath}persona-export.js`;
    script.onload = () => {

        if (window.STPersonaExport) {
            window.STPersonaExport.init(stCustomThemeSettings);
        }
    };
    script.onerror = () => {
        console.warn('ST-CustomTheme: Failed to load persona-export.js');
    };
    document.head.appendChild(script);

    // Load toast-enhancer.js module
    const toastScript = document.createElement('script');
    toastScript.src = `${basePath}toast-enhancer.js`;
    toastScript.onerror = () => {
        console.warn('ST-CustomTheme: Failed to load toast-enhancer.js');
    };
    document.head.appendChild(toastScript);

    // Dynamic style element for custom fonts and colors
    let dynamicStyleEl = document.getElementById('st-custom-theme-dynamic-css');
    if (!dynamicStyleEl) {
        dynamicStyleEl = document.createElement('style');
        dynamicStyleEl.id = 'st-custom-theme-dynamic-css';
        document.head.appendChild(dynamicStyleEl);
    }

    // CSS caching to avoid regenerating when settings unchanged
    let lastDynamicStylesHash = '';

    window.applyDynamicStyles = function applyDynamicStyles() {
        // Create hash of relevant settings to check if regeneration needed
        const settingsHash = JSON.stringify({
            fontSettingsEnabled: stCustomThemeSettings.fontSettingsEnabled,
            uiFont: stCustomThemeSettings.uiFont,
            uiFontSize: stCustomThemeSettings.uiFontSize,
            uiFontWeight: stCustomThemeSettings.uiFontWeight,
            uiLineHeight: stCustomThemeSettings.uiLineHeight,
            inputFont: stCustomThemeSettings.inputFont,
            inputFontSize: stCustomThemeSettings.inputFontSize,
            inputFontWeight: stCustomThemeSettings.inputFontWeight,
            inputLineHeight: stCustomThemeSettings.inputLineHeight,
            inputFontInherit: stCustomThemeSettings.inputFontInherit,
            inputFontSizeInherit: stCustomThemeSettings.inputFontSizeInherit,
            inputFontWeightInherit: stCustomThemeSettings.inputFontWeightInherit,
            inputLineHeightInherit: stCustomThemeSettings.inputLineHeightInherit,
            chatFont: stCustomThemeSettings.chatFont,
            chatFontSize: stCustomThemeSettings.chatFontSize,
            chatFontWeight: stCustomThemeSettings.chatFontWeight,
            chatLineHeight: stCustomThemeSettings.chatLineHeight,
            mesTextFont: stCustomThemeSettings.mesTextFont,
            mesTextFontSize: stCustomThemeSettings.mesTextFontSize,
            mesTextFontWeight: stCustomThemeSettings.mesTextFontWeight,
            mesTextLineHeight: stCustomThemeSettings.mesTextLineHeight,
            mesTextFontInherit: stCustomThemeSettings.mesTextFontInherit,
            mesTextFontSizeInherit: stCustomThemeSettings.mesTextFontSizeInherit,
            mesTextFontWeightInherit: stCustomThemeSettings.mesTextFontWeightInherit,
            mesTextLineHeightInherit: stCustomThemeSettings.mesTextLineHeightInherit,
            customFonts: stCustomThemeSettings.customFonts.map(f => f.name),
            hoverColor: stCustomThemeSettings.hoverColor,
            darkMode: stCustomThemeSettings.darkMode,
            hoverColor: stCustomThemeSettings.hoverColor,
            darkMode: stCustomThemeSettings.darkMode,
            sendTextareaPlaceholder: stCustomThemeSettings.sendTextareaPlaceholder,
            alwaysShowExtraButtons: stCustomThemeSettings.alwaysShowExtraButtons,
            showDeleteButton: stCustomThemeSettings.showDeleteButton
        });

        // Skip regeneration if settings unchanged
        if (settingsHash === lastDynamicStylesHash) {
            // Still apply menu classes (cheap operation)
            applyMenuClasses();
            return;
        }
        lastDynamicStylesHash = settingsHash;

        let css = '';

        // Custom fonts @font-face (always apply so fonts are available)
        stCustomThemeSettings.customFonts.forEach(f => {
            css += f.fontFace + '\n';
        });

        // Apply font settings only if enabled
        if (stCustomThemeSettings.fontSettingsEnabled) {
            // UI Font - apply to body and common UI elements (EXCLUDE #chat area to preserve theme/extension fonts)
            if (stCustomThemeSettings.uiFont) {
                css += `
                    body:not(#chat):not(#chat *),
                    body div:not(#chat):not(#chat *),
                    body span:not(#chat):not(#chat *),
                    body p:not(#chat):not(#chat *),
                    body a:not(#chat):not(#chat *),
                    body label:not(#chat):not(#chat *),
                    body button:not(#chat):not(#chat *),
                    body input:not(#chat):not(#chat *),
                    body select:not(#chat):not(#chat *),
                    body textarea:not(#send_textarea),
                    body h1:not(#chat):not(#chat *), body h2:not(#chat):not(#chat *), body h3:not(#chat):not(#chat *),
                    body h4:not(#chat):not(#chat *), body h5:not(#chat):not(#chat *), body h6:not(#chat):not(#chat *),
                    body li:not(#chat):not(#chat *),
                    body td:not(#chat):not(#chat *),
                    body th:not(#chat):not(#chat *) {
                        font-family: "${stCustomThemeSettings.uiFont}", sans-serif !important;
                    }
                \n`;
            }
            css += `
                body,
                input, select, textarea, button,
                .menu_button, .menu_button span, .menu_button_icon, .menu_button_icon span,
                .drawer-content, .drawer-toggle, .inline-drawer-header,
                .range-block, .range-block-title, label, span,
                #top-settings-holder, #form_sheld,
                .mes_buttons, .mes_edit_buttons {
                    ${stCustomThemeSettings.uiFontSize ? `font-size: ${stCustomThemeSettings.uiFontSize}px !important;` : ''}
                }
                body {
                    ${stCustomThemeSettings.uiFontWeight ? `font-weight: ${stCustomThemeSettings.uiFontWeight} !important;` : ''}
                    ${stCustomThemeSettings.uiLineHeight ? `line-height: ${stCustomThemeSettings.uiLineHeight} !important;` : ''}
                }
            \n`;
            // Force Font Awesome for i tags (must come after UI font rules)
            css += `
                i, i.fa, i.fas, i.far, i.fab, i.fa-solid, i.fa-regular, i.fa-brands,
                .fa, .fas, .far, .fab, .fa-solid, .fa-regular, .fa-brands,
                [class*="fa-"]:not(button):not(.menu_button) {
                    font-family: "Font Awesome 6 Free", "Font Awesome 6 Brands" !important;
                    font-size: 14px !important;
                }
                button i, .menu_button i, .menu_button_icon i {
                    font-size: 14px !important;
                }
                i::before, .fa::before, .fas::before, .far::before, .fab::before,
                [class*="fa-"]::before {
                    font-family: "Font Awesome 6 Free", "Font Awesome 6 Brands" !important;
                    font-weight: 900 !important;
                }
            \n`;

            // Input Field Font
            let inputCss = '';
            const inputFontName = stCustomThemeSettings.inputFontInherit ? stCustomThemeSettings.uiFont : stCustomThemeSettings.inputFont;
            if (inputFontName) {
                inputCss += `font-family: "${inputFontName}", sans-serif !important;`;
            }
            const inputSize = stCustomThemeSettings.inputFontSizeInherit ? stCustomThemeSettings.uiFontSize : stCustomThemeSettings.inputFontSize;
            const inputWeight = stCustomThemeSettings.inputFontWeightInherit ? stCustomThemeSettings.uiFontWeight : stCustomThemeSettings.inputFontWeight;
            const inputLineHeight = stCustomThemeSettings.inputLineHeightInherit ? stCustomThemeSettings.uiLineHeight : stCustomThemeSettings.inputLineHeight;

            if (inputSize) inputCss += `font-size: ${inputSize}px !important;`;
            if (inputWeight) inputCss += `font-weight: ${inputWeight} !important;`;
            if (inputLineHeight) inputCss += `line-height: ${inputLineHeight} !important;`;
            if (inputCss) css += `body.st-custom-theme-active #send_textarea { ${inputCss} }\n`;


            // Chat Font
            if (stCustomThemeSettings.chatFont) {
                css += `
                    #chat .mes_text,
                    #chat .mes_text p,
                    #chat .mes_text span,
                    #chat .mes_block .mes_text {
                        font-family: "${stCustomThemeSettings.chatFont}", sans-serif !important;
                    }\n`;
            }
            css += `
                #chat .mes_text,
                #chat .mes_text p,
                #chat .mes_text span,
                #chat .mes_block .mes_text {
                    ${stCustomThemeSettings.chatFontSize ? `font-size: ${stCustomThemeSettings.chatFontSize}px !important;` : ''}
                    ${stCustomThemeSettings.chatFontWeight ? `font-weight: ${stCustomThemeSettings.chatFontWeight} !important;` : ''}
                    ${stCustomThemeSettings.chatLineHeight ? `line-height: ${stCustomThemeSettings.chatLineHeight} !important;` : ''}
                }\n`;
        }

        // Dialogue Font
        let mesTextCss = '';

        const mesFont = stCustomThemeSettings.mesTextFontInherit ? stCustomThemeSettings.chatFont : stCustomThemeSettings.mesTextFont;
        if (mesFont) {
            mesTextCss += `font-family: "${mesFont}", sans-serif !important; `;
        }

        const mesSize = stCustomThemeSettings.mesTextFontSizeInherit ? stCustomThemeSettings.chatFontSize : stCustomThemeSettings.mesTextFontSize;
        if (mesSize) {
            mesTextCss += `font-size: ${mesSize}px !important; `;
        }

        const mesWeight = stCustomThemeSettings.mesTextFontWeightInherit ? stCustomThemeSettings.chatFontWeight : stCustomThemeSettings.mesTextFontWeight;
        if (mesWeight) {
            mesTextCss += `font-weight: ${mesWeight} !important; `;
        }

        const mesLineHeight = stCustomThemeSettings.mesTextLineHeightInherit ? stCustomThemeSettings.chatLineHeight : stCustomThemeSettings.mesTextLineHeight;
        if (mesLineHeight) {
            mesTextCss += `line-height: ${mesLineHeight} !important; `;
        }

        if (mesTextCss) {
            css += `#chat .mes_text q, #chat .mes_text q * { ${mesTextCss} }\n`;
        }

        // Theme Color - applies to all accent colors
        const themeColor = stCustomThemeSettings.hoverColor;
        css += `:root {
            --st-theme-color: ${themeColor};
            --st-theme-color-hover: ${themeColor};
        }\n`;

        // Apply theme color to sidebar and modal elements
        css += `

            .st-theme-mode-btn.active,
            .st-theme-btn.primary,
            .st-theme-btn-small,
            .st-theme-switch input:checked + .st-theme-slider { background: ${themeColor} !important; }

            .st-theme-mode-btn.active { border-color: ${themeColor} !important; }

            .st-theme-setting-row select:focus,
            .st-theme-setting-row input:focus,
            .st-theme-setting-row textarea:focus { border-color: ${themeColor} !important; }

            .st-theme-sub-item.active {
                color: ${themeColor} !important;
                background: color-mix(in srgb, ${themeColor}, transparent 90%) !important;
            }
        \n`;

        dynamicStyleEl.textContent = css;

        // Send textarea placeholder
        const sendTextarea = document.getElementById('send_textarea');
        if (sendTextarea) {
            if (stCustomThemeSettings.sendTextareaPlaceholder) {
                sendTextarea.setAttribute('placeholder', stCustomThemeSettings.sendTextareaPlaceholder);
            } else {
                // Restore default placeholder
                const defaultPlaceholder = sendTextarea.getAttribute('connected_text') || 'Type a message, or /? for help';
                sendTextarea.setAttribute('placeholder', defaultPlaceholder);
            }
        }

        // Dark mode class on body
        if (stCustomThemeSettings.darkMode) {
            $('body').addClass('st-theme-dark');
        } else {
            $('body').removeClass('st-theme-dark');
        }

        // Apply menu layout and panel style classes
        applyMenuClasses();
        // Verify delete buttons
        verifyDeleteButtons();
        // Verify extra buttons visibility
        applyExtraButtonsVisibility();
    }

    function applyMenuClasses() {
        const body = $('body');
        const mobile = isMobileView();

        // 현재 화면에 맞는 설정 선택
        // 현재 화면에 맞는 설정 선택
        const menuLayout = mobile ? stCustomThemeSettings.menuLayoutStyleMobile : stCustomThemeSettings.menuLayoutStylePC;

        // Remove all menu layout classes first
        body.removeClass('st-menu-layout-sidebar st-menu-layout-topbar st-menu-layout-hamburger st-menu-layout-floating');
        // Add current menu layout class only if not default (sidebar)
        if (menuLayout !== 'sidebar') {
            body.addClass(`st-menu-layout-${menuLayout}`);
        }

        // Add mobile/pc indicator class
        body.removeClass('st-view-pc st-view-mobile');
        body.addClass(mobile ? 'st-view-mobile' : 'st-view-pc');

        // Update modal text in real-time if the modal is open
        updateModalClassInfo();
    }

    function updateModalClassInfo() {
        const mobile = isMobileView();
        const menuLayout = mobile ? stCustomThemeSettings.menuLayoutStyleMobile : stCustomThemeSettings.menuLayoutStylePC;
        const panelStyle = mobile ? stCustomThemeSettings.panelStyleMobile : stCustomThemeSettings.panelStylePC;

        // 메뉴 레이아웃 클래스 텍스트
        const menuClassText = menuLayout === 'sidebar' ? '(기본값 - 클래스 없음)' : `st-menu-layout-${menuLayout}`;
        $('#st-menu-layout-class-info').text(menuClassText);

        // 현재 화면 크기 표시
        $('#st-current-view-info').text(mobile ? '모바일' : 'PC');
    }

    // 화면 크기 변경 시 클래스 재적용 (디바운싱 적용)
    let resizeTimeout;
    $(window).on('resize', function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(applyMenuClasses, 150);
    });

    // Apply on load
    applyDynamicStyles();
    applyIconSettings();

    // Helper: Show Crop Modal
    function showCropModal(file, callback) {
        const reader = new FileReader();
        reader.onload = function (e) {
            // Create modal DOM
            const modalId = 'st-crop-modal-' + Date.now();
            const modalHtml = `
            <div id="${modalId}" class="st-theme-popup-overlay">
                <div class="st-theme-popup" style="width: 500px; max-width: 90vw;">
                    <div class="st-theme-popup-header">
                        <h3>이미지 자르기</h3>
                        <button class="st-theme-popup-close"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="st-theme-popup-content">
                        <div style="max-height: 400px; overflow: hidden; background: #333;">
                            <img id="st-crop-image" src="${e.target.result}" style="max-width: 100%;">
                        </div>
                        <p class="st-theme-muted" style="margin-top: 10px;">마우스 휠로 확대/축소, 드래그하여 이동할 수 있습니다.</p>
                    </div>
                    <div class="st-theme-popup-footer">
                        <button id="st-crop-confirm" class="st-theme-btn primary">확인</button>
                        <button id="st-crop-cancel" class="st-theme-btn">취소</button>
                    </div>
                </div>
            </div>`;

            $('body').append(modalHtml);

            // Initialize Cropper
            // We need to wait for the image to be in the DOM? apppend is synchronous.
            // But image loading might be? src is dataURL, so it should be fast.
            // We'll target the image element.
            const image = $('#' + modalId + ' #st-crop-image')[0];

            let cropper = new Cropper(image, {
                aspectRatio: 1,
                viewMode: 1,
                autoCropArea: 0.8,
                responsive: true,
                ready: function () {
                    // Cropper ready
                }
            });

            // Handlers
            const closeModal = () => {
                if (cropper) {
                    cropper.destroy();
                    cropper = null;
                }
                $(`#${modalId}`).remove();
            };

            $(`#${modalId} .st-theme-popup-close, #${modalId} #st-crop-cancel`).on('click', closeModal);
            $(`#${modalId}`).on('click', function (e) {
                if (e.target === this) closeModal();
            });

            $(`#${modalId} #st-crop-confirm`).on('click', function () {
                if (!cropper) return;
                const canvas = cropper.getCroppedCanvas({
                    width: 192,
                    height: 192,
                    imageSmoothingQuality: 'high'
                });

                callback(canvas.toDataURL('image/png'));
                closeModal();
            });
        };
        reader.readAsDataURL(file);
    }

    // Helper: Resize image to target dimensions (always square for icons)
    function resizeImage(file, size, callback) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');

                // Draw image to fit/cover 192x192.
                // We'll use "contain" style behavior (fit within box, preserve aspect ratio)
                // or "cover" (fill box). For icons, "cover" is usually better to avoid empty space,
                // but "contain" ensures nothing is cut off. Let's strictly resize to 192x192.
                // Simpler approach: Draw stretched for now, or let's do a center crop (cover).

                // Let's implement 'cover' (center and crop)
                const scale = Math.max(size / img.width, size / img.height);
                const x = (size / 2) - (img.width / 2) * scale;
                const y = (size / 2) - (img.height / 2) * scale;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                callback(canvas.toDataURL('image/png'));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Track applied settings to avoid redundant processing
    let lastAppliedIconSettings = '';

    // Apply Favicon, WebApp Icons, and Tab Title
    async function applyIconSettings() {
        const favicon = stCustomThemeSettings.customFavicon;
        const webAppIcon = stCustomThemeSettings.customWebAppIcon;
        const tabTitle = stCustomThemeSettings.customTabTitle;

        // Create a signature of current relevant settings
        const currentSettingsSignature = JSON.stringify({
            favicon,
            webAppIcon,
            tabTitle,
            webAppNameSameAsTab: stCustomThemeSettings.webAppNameSameAsTab,
            webAppName: stCustomThemeSettings.customWebAppName
        });

        // 1. Tab Title (Always enforce this cheaply, as ST might overwrite it)
        if (tabTitle && document.title !== tabTitle) {
            document.title = tabTitle;
        }

        // If settings haven't changed, skip the expensive DOM/Network operations
        if (lastAppliedIconSettings === currentSettingsSignature) {
            return;
        }
        lastAppliedIconSettings = currentSettingsSignature;


        // 2. Favicon
        // Remove existing favicons to ensure ours takes precedence
        const oldFavicons = document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']");
        oldFavicons.forEach(el => el.remove());

        const linkFavicon = document.createElement('link');
        linkFavicon.rel = 'icon';
        // Auto-detect type if base64 png
        linkFavicon.type = (favicon && favicon.startsWith('data:image/png')) ? 'image/png' : 'image/x-icon';
        linkFavicon.href = favicon || 'favicon.ico';
        document.head.appendChild(linkFavicon);

        // 2. Apple Touch Icon (iOS)
        // Remove existing and add new one to ensure change
        document.querySelectorAll("link[rel='apple-touch-icon']").forEach(e => e.remove());

        const linkApple = document.createElement('link');
        linkApple.rel = 'apple-touch-icon';
        linkApple.href = webAppIcon || 'img/apple-icon-192x192.png';
        document.head.appendChild(linkApple);

        // 3. Dynamic Manifest (Android)
        // Determine web app name
        const webAppName = stCustomThemeSettings.webAppNameSameAsTab
            ? (tabTitle || null)
            : (stCustomThemeSettings.customWebAppName || null);

        if (webAppIcon || webAppName) {
            try {
                // Fetch original manifest to keep other settings
                const response = await fetch('manifest.json');
                const manifest = await response.json();

                // Helper to resolve relative URLs to absolute
                const resolveUrl = (url) => {
                    if (!url) return url;
                    try {
                        return new URL(url, document.baseURI).href;
                    } catch (e) {
                        return url;
                    }
                };

                // Replace icons if custom icon provided
                if (webAppIcon) {
                    const absoluteIconUrl = resolveUrl(webAppIcon);
                    manifest.icons = [
                        { src: absoluteIconUrl, sizes: "192x192", type: "image/png" },
                        { src: absoluteIconUrl, sizes: "512x512", type: "image/png" }
                    ];
                } else if (manifest.icons) {
                    // Even if not replacing, we must ensure existing relative paths are absolute
                    // because Blob URL changes the base context
                    manifest.icons = manifest.icons.map(icon => ({
                        ...icon,
                        src: resolveUrl(icon.src)
                    }));
                }

                // Replace name if custom name provided
                if (webAppName) {
                    manifest.name = webAppName;
                    manifest.short_name = webAppName;
                }

                // IMPORTANT: Fix start_url and other relative paths
                // Blob URLs break relative paths, so we must make them absolute
                if (manifest.start_url) {
                    manifest.start_url = resolveUrl(manifest.start_url);
                }

                const stringManifest = JSON.stringify(manifest);
                const blob = new Blob([stringManifest], { type: 'application/json' });
                const manifestURL = URL.createObjectURL(blob);

                let linkManifest = document.querySelector("link[rel='manifest']");
                if (linkManifest) {
                    linkManifest.href = manifestURL;
                } else {
                    linkManifest = document.createElement('link');
                    linkManifest.rel = 'manifest';
                    linkManifest.href = manifestURL;
                    document.head.appendChild(linkManifest);
                }
            } catch (e) {
                console.error('ST-CustomTheme: Failed to apply dynamic manifest', e);
            }
        } else {
            // Restore default manifest only if no customizations are active
            let linkManifest = document.querySelector("link[rel='manifest']");
            if (linkManifest && !webAppName) linkManifest.href = 'manifest.json';
        }
    }

    // --- Extension Menu Visibility Control ---
    let spellcheckObserver = null;
    let spellcheckParentObserver = null;
    let spellcheckInterval = null;

    function initSpellcheckObserver() {
        // Disconnect existing observers/intervals
        if (spellcheckObserver) {
            spellcheckObserver.disconnect();
            spellcheckObserver = null;
        }
        if (spellcheckParentObserver) {
            spellcheckParentObserver.disconnect();
            spellcheckParentObserver = null;
        }
        if (spellcheckInterval) {
            clearInterval(spellcheckInterval);
            spellcheckInterval = null;
        }

        const textarea = document.getElementById('send_textarea');
        if (!textarea) return;

        // 1. Observer for the textarea attributes (Spellcheck enforcement)
        const attachAttributeObserver = (targetNode) => {
            if (spellcheckObserver) spellcheckObserver.disconnect();

            spellcheckObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'spellcheck') {
                        const shouldDisable = stCustomThemeSettings.spellcheckEnabled; // True = Disable
                        const desiredValue = shouldDisable ? 'false' : 'true';
                        const currentValue = targetNode.getAttribute('spellcheck');

                        if (currentValue !== desiredValue) {
                            targetNode.setAttribute('spellcheck', desiredValue);
                            targetNode.spellcheck = !shouldDisable;
                        }
                    }
                });
            });
            spellcheckObserver.observe(targetNode, { attributes: true, attributeFilter: ['spellcheck'] });
        };

        // Attach initial
        attachAttributeObserver(textarea);
        applySpellcheck();

        // 2. Observer for the parent (Handling Re-rendering/Replacement of textarea)
        const parent = textarea.parentElement;
        if (parent) {
            spellcheckParentObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.id === 'send_textarea') {
                                // Textarea re-created
                                attachAttributeObserver(node);
                                applySpellcheck();
                            }
                        });
                    }
                });
            });
            spellcheckParentObserver.observe(parent, { childList: true });
        }

        // 3. Polling Interval (The Hammer) - Checks every 1s to ensure Property is correct, even if attribute didn't change
        spellcheckInterval = setInterval(() => {
            const currentTextarea = document.getElementById('send_textarea');
            if (currentTextarea) {
                const shouldDisable = stCustomThemeSettings.spellcheckEnabled;
                // Check Property
                if (currentTextarea.spellcheck !== !shouldDisable) {
                    // console.log('ST-CustomTheme: Polling enforcement triggered');
                    currentTextarea.spellcheck = !shouldDisable;
                }
                // Check Attribute
                if (currentTextarea.getAttribute('spellcheck') !== (shouldDisable ? 'false' : 'true')) {
                    currentTextarea.setAttribute('spellcheck', shouldDisable ? 'false' : 'true');
                }
            }
        }, 1000);
    }

    function applyExtensionVisibility() {
        const menu = document.getElementById('extensionsMenu');
        if (!menu) return;

        const hiddenItems = stCustomThemeSettings.hiddenExtensionItems || [];

        Array.from(menu.children).forEach(child => {
            const text = child.innerText.trim();
            if (!text) return;

            const shouldHide = hiddenItems.includes(text);
            const isHidden = child.style.display === 'none';

            // Only modify if state needs to change
            if (shouldHide && !isHidden) {
                child.style.display = 'none';
            } else if (!shouldHide && isHidden) {
                child.style.display = '';
            }
        });
    }

    function initExtensionMenuObserver() {
        // No automatic timers - user uses refresh button
        // Initial application only
        applyExtensionVisibility();
        applySpellcheck(); // Ensure spellcheck is applied on init
        initDeleteButtonObserver();

        // Add observers for Spellcheck re-application
        const eventSource = SillyTavern.getContext().eventSource;
        const eventTypes = SillyTavern.getContext().eventTypes;

        const spellcheckHandler = () => {
            // Small delay to ensure DOM is ready
            setTimeout(applySpellcheck, 100);
        };

        eventSource.on(eventTypes.CHAT_CHANGED, spellcheckHandler);
        eventSource.on(eventTypes.MORE_MESSAGES_LOADED, spellcheckHandler);

        // Also watch for direct input rendering if possible, but CHAT_CHANGED covers most.
        // As a fallback, observe the textarea itself for attribute changes?
        // No, that might be overkill and cause loops.
        // Just add a one-time listener to the textarea for focus to re-enforce it.
        $(document).on('focus', '#send_textarea', function () {
            applySpellcheck();
        });

        // Initialize MutationObserver
        initSpellcheckObserver();
    }

    // --- Spellcheck Control ---
    function applySpellcheck() {
        const textarea = document.getElementById('send_textarea');
        if (textarea) {
            // Logic inverted: Truthy setting means "Disable Spellcheck"
            // Default is false (Enabled)
            const shouldDisable = stCustomThemeSettings.spellcheckEnabled;

            // Forcefully set both Attribute and Property
            const value = shouldDisable ? 'false' : 'true';
            textarea.setAttribute('spellcheck', value);
            textarea.spellcheck = !shouldDisable;
        }
    }

    // --- Message Action Buttons Control ---
    function applyExtraButtonsVisibility() {
        if (stCustomThemeSettings.alwaysShowExtraButtons) {
            $('body').addClass('st-show-extra-buttons');
        } else {
            $('body').removeClass('st-show-extra-buttons');
        }
    }

    // --- Message Delete Button Control ---
    function verifyDeleteButtons() {
        if (stCustomThemeSettings.showDeleteButton) {
            injectDeleteButtons();
        } else {
            $('.st-custom-delete-button').remove();
        }
    }

    function injectDeleteButtons() {
        // Find messages that don't have the delete button yet
        $('.mes').each(function () {
            const message = $(this);
            const buttonsContainer = message.find('.mes_buttons');

            // Skip if no buttons container (e.g. system messages might behave differently, but usually safe)
            if (buttonsContainer.length === 0) return;

            // Check if button already exists
            if (message.find('.st-custom-delete-button').length > 0) return;

            // Create Delete Button
            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'mes_button st-custom-delete-button';
            deleteBtn.setAttribute('title', '메시지 삭제');
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';

            // Append to container
            buttonsContainer.append(deleteBtn);
        });
    }

    // Delegated Event Listener for Delete Button
    // This ensures clicks work even if messages are re-rendered by SillyTavern
    $(document).on('click', '.st-custom-delete-button', async function (e) {
        e.stopPropagation();

        const btn = $(this);
        const message = btn.closest('.mes');
        const mesId = message.attr('mesid');

        console.log('ST-CustomTheme: Delete button clicked (Delegated)', { mesId });

        if (typeof mesId === 'undefined' || mesId === null) {
            console.error('ST-CustomTheme: mesId missing');
            return;
        }

        try {
            const context = SillyTavern.getContext();
            if (!context) {
                console.error('ST-CustomTheme: SillyTavern context missing');
                return;
            }

            const confirm = context.powerUserSettings?.confirm_message_delete;
            console.log('ST-CustomTheme: calling deleteMessage', { mesId, confirm });

            if (typeof context.deleteMessage !== 'function') {
                console.error('ST-CustomTheme: deleteMessage function not found in context. Trying global fallback.');
                if (typeof window.deleteMessage === 'function') {
                    return await window.deleteMessage(Number(mesId), undefined, confirm);
                }
                throw new Error('deleteMessage not found');
            }

            // Call SillyTavern's deleteMessage function
            await context.deleteMessage(Number(mesId), undefined, confirm);
        } catch (err) {
            console.error('ST-CustomTheme: Error executing deleteMessage', err);
            toastr.error('메시지 삭제 중 오류가 발생했습니다. 콘솔을 확인해주세요.');
        }
    });

    // Event Listeners for Delete Button injection
    function initDeleteButtonObserver() {
        const eventSource = SillyTavern.getContext().eventSource;
        const eventTypes = SillyTavern.getContext().eventTypes;

        const injectHandler = () => {
            if (stCustomThemeSettings.showDeleteButton) {
                injectDeleteButtons();
            }
        };

        eventSource.on(eventTypes.MESSAGE_RECEIVED, injectHandler);
        eventSource.on(eventTypes.CHAT_CHANGED, injectHandler);
        eventSource.on(eventTypes.MESSAGE_UPDATED, injectHandler);
        // Also run on more messages loaded (e.g. scrolling up)
        eventSource.on(eventTypes.MORE_MESSAGES_LOADED, injectHandler);
    }

    // 2. Settings Popup Functions
    // Returns { name: displayName, fontFamily: actualCSSFontFamily }[]
    function getFontOptions() {
        const systemFonts = [
            { name: '', fontFamily: '' },
            { name: 'Noto Sans', fontFamily: 'Noto Sans' },
            { name: 'Arial', fontFamily: 'Arial' },
            { name: 'Helvetica', fontFamily: 'Helvetica' },
            { name: 'Georgia', fontFamily: 'Georgia' },
            { name: 'Times New Roman', fontFamily: 'Times New Roman' }
        ];
        // Built-in fonts (기본 제공 폰트)
        const builtInFonts = [
            { name: 'Pretendard (프리텐다드)', fontFamily: 'Pretendard Variable' },
            { name: 'Ridibatang (리디바탕)', fontFamily: 'Ridibatang' },
            { name: 'InkLiquid (잉크리퀴드)', fontFamily: 'InkLiquid' },
            { name: 'ChosunIlboMyungjo (조선일보명조)', fontFamily: 'ChosunIlboMyungjo' }
        ];
        const customFonts = stCustomThemeSettings.customFonts.map(f => ({
            name: f.name,
            fontFamily: f.fontFamily || f.name
        }));
        return [...systemFonts, ...builtInFonts, ...customFonts];
    }

    function renderFontOptions(selectedFontFamily) {
        return getFontOptions().map(f => {
            const fontStyle = f.fontFamily ? `style="font-family: '${f.fontFamily}', sans-serif;"` : '';
            return `<option value="${f.fontFamily}" ${fontStyle} ${f.fontFamily === selectedFontFamily ? 'selected' : ''}>${f.name || '기본값'}</option>`;
        }).join('');
    }

    // 폰트 크기 옵션 생성 (12-30px)
    function renderFontSizeOptions(selectedValue, id) {
        const sizes = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
        let options = `<option value="" ${!selectedValue ? 'selected' : ''}>기본값</option>`;
        sizes.forEach(size => {
            options += `<option value="${size}" ${selectedValue == size ? 'selected' : ''}>${size}px</option>`;
        });
        return options;
    }

    // 행간 옵션 생성 (1.0-3.0, 0.1 단위)
    function renderLineHeightOptions(selectedValue, id) {
        let options = `<option value="" ${!selectedValue ? 'selected' : ''}>기본값</option>`;
        for (let i = 10; i <= 30; i++) {
            const val = i / 10;
            options += `<option value="${val}" ${selectedValue == val ? 'selected' : ''}>${val.toFixed(1)}</option>`;
        }
        return options;
    }

    function renderCustomFontList() {
        if (stCustomThemeSettings.customFonts.length === 0) {
            return '<p class="st-theme-muted">추가된 커스텀 폰트가 없습니다.</p>';
        }
        return stCustomThemeSettings.customFonts.map((f, i) => `
            <div class="st-theme-font-item" data-index="${i}">
                <span>${f.name}</span>
                <div class="st-theme-font-actions">
                    <button class="st-theme-btn-icon st-font-edit" title="수정"><i class="fa-solid fa-pen"></i></button>
                    <button class="st-theme-btn-icon st-font-delete" title="삭제"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    // Menu name mapping (shared)
    const menuNames = {
        'ai-config-button': '프리셋',
        'sys-settings-button': 'API 연결',
        'advanced-formatting-button': '고급 서식',
        'WI-SP-button': '월드 인포',
        'user-settings-button': '사용자 설정',
        'backgrounds-button': '시스템 배경',
        'extensions-settings-button': '확장',
        'persona-management-button': '페르소나',
        'rightNavHolder': '캐릭터',
    };

    function getMenuName(id, fallbackTitle) {
        return menuNames[id] || fallbackTitle || id.replace(/-/g, ' ').replace(/_/g, ' ');
    }

    function getButtonList() {
        // Dynamically get all moved drawers and buttons from sidebar/hamburger
        const buttons = [];
        const seenIds = new Set();

        // Get all drawers in relevant containers (use direct child selectors to avoid nested drawers)
        $('#top-settings-holder > .drawer, #st-sidebar-top-container > .drawer, #st-hamburger-drawer-holder > .drawer, #st-hamburger-menu-bar > .drawer').each(function () {
            const id = $(this).attr('id');
            if (id && !seenIds.has(id)) {
                seenIds.add(id);
                const fallbackTitle = $(this).find('.drawer-icon').attr('title') ||
                    $(this).find('[title]').first().attr('title');
                buttons.push({ id, name: getMenuName(id, fallbackTitle) });
            }
        });

        // Get any standalone buttons
        $('#top-settings-holder > .menu_button, #st-sidebar-top-container > .menu_button').each(function () {
            const id = $(this).attr('id');
            if (id && !seenIds.has(id)) {
                seenIds.add(id);
                const fallbackTitle = $(this).attr('title') || $(this).text().trim();
                buttons.push({ id, name: getMenuName(id, fallbackTitle) });
            }
        });

        return buttons;
    }
    function showSettingsPopup() {
        $('#st-custom-theme-popup').remove();

        const popupHtml = `
        <div id="st-custom-theme-popup" class="st-theme-popup-overlay">
            <div class="st-theme-popup st-theme-popup-tabbed">
            <div id="st-sticky-overlay" class="st-sticky-overlay"></div>
                <button class="st-theme-popup-close"><i class="fa-solid fa-xmark"></i></button>

                <div class="st-theme-popup-sidebar">
                    <div class="st-theme-tab-group">
                        <div class="st-theme-tab-group-title">설정</div>

                        <!-- 1. General -->
                        <div class="st-theme-tab active" data-tab="general">
                            <i class="fa-solid fa-gear"></i>
                            <span>일반</span>
                        </div>

                        <!-- 2. Fonts -->
                        <div class="st-theme-tab" data-tab="fonts">
                            <i class="fa-solid fa-font"></i>
                            <span>폰트</span>
                        </div>

                        <!-- 3. Menu (Sub-menu) -->
                        <div class="st-theme-tab" data-tab="menu">
                            <i class="fa-solid fa-bars"></i>
                            <span>메뉴</span>
                        </div>
                        <div class="st-theme-sub-group" id="st-sub-menu-group">
                            <div class="st-theme-sub-item active" data-sub="buttons">
                                <i class="fa-solid fa-toggle-on"></i> 버튼 표시
                            </div>
                            <div class="st-theme-sub-item" data-sub="layout">
                                <i class="fa-solid fa-table-columns"></i> 레이아웃
                            </div>
                            <div class="st-theme-sub-item" data-sub="icons">
                                <i class="fa-solid fa-icons"></i> 아이콘
                            </div>
                        </div>

                        <!-- 4. Window -->
                        <div class="st-theme-tab" data-tab="window">
                            <i class="fa-solid fa-desktop"></i>
                            <span>창</span>
                        </div>

                        <!-- 5. Chat -->
                        <div class="st-theme-tab" data-tab="chat">
                            <i class="fa-solid fa-comment"></i>
                            <span>채팅</span>
                        </div>

                        <!-- 6. Tools (Sub-menu) -->
                        <div class="st-theme-tab" data-tab="tools">
                            <i class="fa-solid fa-toolbox"></i>
                            <span>도구</span>
                        </div>
                        <div class="st-theme-sub-group" id="st-sub-tools-group">
                            <div class="st-theme-sub-item active" data-sub="extensions">
                                <i class="fa-solid fa-wand-magic-sparkles"></i> 요술봉 메뉴
                            </div>
                            <div class="st-theme-sub-item" data-sub="persona">
                                <i class="fa-solid fa-user-circle"></i> 페르소나
                            </div>
                        </div>
                    </div>
                </div>

                <div class="st-theme-popup-main">

                <div class="st-sticky-anchor">
<!-- Smart Sticky Preview (Inside Main) -->
                <div id="st-sticky-preview-trigger" class="st-sticky-trigger">
                    <i class="fa-solid fa-font"></i> <span>폰트 미리보기</span> <i class="fa-solid fa-chevron-down" style="font-size: 0.8em; margin-left: 4px;"></i>
                </div>
                <div id="st-sticky-preview-panel" class="st-sticky-panel">
                        <div class="st-sticky-header">
                        <span>폰트 미리보기</span>
                        <button id="st-sticky-close" class="st-theme-btn-icon"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="st-font-preview-card st-sticky-card-content">
                        <div class="st-font-preview-row">
                            <div class="st-font-preview-label">UI:</div>
                            <div class="st-font-preview-text" id="st-preview-ui-sticky">다람쥐 헌 쳇바퀴에 타고파 (The quick brown fox...)</div>
                        </div>
                        <div class="st-font-preview-row">
                            <div class="st-font-preview-label">입력:</div>
                            <div class="st-font-preview-text" id="st-preview-input-sticky">다람쥐 헌 쳇바퀴에 타고파 (The quick brown fox...)</div>
                        </div>
                        <div class="st-font-preview-row">
                            <div class="st-font-preview-label">채팅:</div>
                            <div class="st-font-preview-text" id="st-preview-chat-sticky">다람쥐 헌 쳇바퀴에 타고파 (The quick brown fox...)</div>
                        </div>
                        <div class="st-font-preview-row">
                            <div class="st-font-preview-label">대사:</div>
                            <div class="st-font-preview-text" id="st-preview-dialogue-sticky">"다람쥐 헌 쳇바퀴에 타고파" ("The quick brown fox...")</div>
                        </div>
                    </div>
                </div>

                    <!-- 2. Fonts -->
                    </div>
<div class="st-theme-tab-content" data-tab="fonts">

                        <h2>폰트 설정</h2>

                        <div class="st-theme-toggle-row">
                            <span>폰트 설정 사용</span>
                            <label class="st-theme-switch">
                                <input type="checkbox" id="st-font-settings-enabled" ${stCustomThemeSettings.fontSettingsEnabled ? 'checked' : ''}>
                                <span class="st-theme-slider"></span>
                            </label>
                        </div>
                        <p class="st-theme-muted">이 설정을 켜면 실리태번의 기본 폰트 설정을 덮어씁니다.</p>

                        <div class="st-theme-divider"></div>

                        <div id="st-font-settings-content" class="${!stCustomThemeSettings.fontSettingsEnabled ? 'st-disabled' : ''}">

                            <!-- Font Preview Card -->
                            <div class="st-font-preview-card">
                                <div class="st-font-preview-row">
                                    <div class="st-font-preview-label">UI:</div>
                                    <div class="st-font-preview-text" id="st-preview-ui">다람쥐 헌 쳇바퀴에 타고파 (The quick brown fox...)</div>
                                </div>
                                <div class="st-font-preview-row">
                                    <div class="st-font-preview-label">입력:</div>
                                    <div class="st-font-preview-text" id="st-preview-input">다람쥐 헌 쳇바퀴에 타고파 (The quick brown fox...)</div>
                                </div>
                                <div class="st-font-preview-row">
                                    <div class="st-font-preview-label">채팅:</div>
                                    <div class="st-font-preview-text" id="st-preview-chat">다람쥐 헌 쳇바퀴에 타고파 (The quick brown fox...)</div>
                                </div>
                                <div class="st-font-preview-row">
                                    <div class="st-font-preview-label">대사:</div>
                                    <div class="st-font-preview-text" id="st-preview-dialogue">"다람쥐 헌 쳇바퀴에 타고파" ("The quick brown fox...")</div>
                                </div>
                            </div>

                            <div class="st-theme-section-header">
                                <h3>UI 폰트</h3>
                            </div>
                            <div class="st-theme-setting-row">
                                <label>폰트</label>
                                <select id="st-ui-font">${renderFontOptions(stCustomThemeSettings.uiFont)}</select>
                            </div>
                            <div class="st-theme-setting-row st-theme-row-inline">
                                <div>
                                    <label>크기</label>
                                    <select id="st-ui-font-size">${renderFontSizeOptions(stCustomThemeSettings.uiFontSize)}</select>
                                </div>
                                <div>
                                    <label>굵기</label>
                                    <select id="st-ui-font-weight">
                                        <option value="" ${!stCustomThemeSettings.uiFontWeight ? 'selected' : ''}>기본값</option>
                                        <option value="100" ${stCustomThemeSettings.uiFontWeight == 100 ? 'selected' : ''}>100 (Thin)</option>
                                        <option value="200" ${stCustomThemeSettings.uiFontWeight == 200 ? 'selected' : ''}>200 (ExtraLight)</option>
                                        <option value="300" ${stCustomThemeSettings.uiFontWeight == 300 ? 'selected' : ''}>300 (Light)</option>
                                        <option value="400" ${stCustomThemeSettings.uiFontWeight == 400 ? 'selected' : ''}>400 (Regular)</option>
                                        <option value="500" ${stCustomThemeSettings.uiFontWeight == 500 ? 'selected' : ''}>500 (Medium)</option>
                                        <option value="600" ${stCustomThemeSettings.uiFontWeight == 600 ? 'selected' : ''}>600 (SemiBold)</option>
                                        <option value="700" ${stCustomThemeSettings.uiFontWeight == 700 ? 'selected' : ''}>700 (Bold)</option>
                                        <option value="800" ${stCustomThemeSettings.uiFontWeight == 800 ? 'selected' : ''}>800 (ExtraBold)</option>
                                        <option value="900" ${stCustomThemeSettings.uiFontWeight == 900 ? 'selected' : ''}>900 (Black)</option>
                                    </select>
                                </div>
                                <div>
                                    <label>행간</label>
                                    <select id="st-ui-line-height">${renderLineHeightOptions(stCustomThemeSettings.uiLineHeight)}</select>
                                </div>
                            </div>

                            <div class="st-theme-divider"></div>

                            <div class="st-theme-section-header">
                                <h3>입력창 폰트</h3>
                            </div>
                            <p class="st-theme-muted" style="margin-bottom: 10px;">스위치를 켜면 UI 폰트 설정과 동일하게 적용됩니다.</p>

                            <div class="st-theme-setting-row">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <label>폰트</label>
                                    <div style="font-size: 0.8em; display: flex; align-items: center; gap: 5px;">
                                        <label class="st-theme-switch" style="transform: scale(0.7);">
                                            <input type="checkbox" id="st-input-font-inherit" ${stCustomThemeSettings.inputFontInherit ? 'checked' : ''}>
                                            <span class="st-theme-slider"></span>
                                        </label>
                                    </div>
                                </div>
                                <select id="st-input-font" style="width: 100%;" ${stCustomThemeSettings.inputFontInherit ? 'disabled' : ''}>
                                    ${renderFontOptions(stCustomThemeSettings.inputFont)}
                                </select>
                            </div>

                            <div class="st-theme-setting-row st-theme-row-inline">
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                        <label>크기</label>
                                        <div style="font-size: 0.8em; display: flex; align-items: center; gap: 5px;">
                                            <label class="st-theme-switch" style="transform: scale(0.7);">
                                                <input type="checkbox" id="st-input-font-size-inherit" ${stCustomThemeSettings.inputFontSizeInherit ? 'checked' : ''}>
                                                <span class="st-theme-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                    <select id="st-input-font-size" style="width: 100%;" ${stCustomThemeSettings.inputFontSizeInherit ? 'disabled' : ''}>${renderFontSizeOptions(stCustomThemeSettings.inputFontSize)}</select>
                                </div>
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                        <label>굵기</label>
                                        <div style="font-size: 0.8em; display: flex; align-items: center; gap: 5px;">
                                            <label class="st-theme-switch" style="transform: scale(0.7);">
                                                <input type="checkbox" id="st-input-font-weight-inherit" ${stCustomThemeSettings.inputFontWeightInherit ? 'checked' : ''}>
                                                <span class="st-theme-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                    <select id="st-input-font-weight" style="width: 100%;" ${stCustomThemeSettings.inputFontWeightInherit ? 'disabled' : ''}>
                                        <option value="" ${!stCustomThemeSettings.inputFontWeight ? 'selected' : ''}>기본값</option>
                                        <option value="100" ${stCustomThemeSettings.inputFontWeight == 100 ? 'selected' : ''}>100</option>
                                        <option value="200" ${stCustomThemeSettings.inputFontWeight == 200 ? 'selected' : ''}>200</option>
                                        <option value="300" ${stCustomThemeSettings.inputFontWeight == 300 ? 'selected' : ''}>300</option>
                                        <option value="400" ${stCustomThemeSettings.inputFontWeight == 400 ? 'selected' : ''}>400</option>
                                        <option value="500" ${stCustomThemeSettings.inputFontWeight == 500 ? 'selected' : ''}>500</option>
                                        <option value="600" ${stCustomThemeSettings.inputFontWeight == 600 ? 'selected' : ''}>600</option>
                                        <option value="700" ${stCustomThemeSettings.inputFontWeight == 700 ? 'selected' : ''}>700</option>
                                        <option value="800" ${stCustomThemeSettings.inputFontWeight == 800 ? 'selected' : ''}>800</option>
                                        <option value="900" ${stCustomThemeSettings.inputFontWeight == 900 ? 'selected' : ''}>900</option>
                                    </select>
                                </div>
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                        <label>행간</label>
                                        <div style="font-size: 0.8em; display: flex; align-items: center; gap: 5px;">
                                            <label class="st-theme-switch" style="transform: scale(0.7);">
                                                <input type="checkbox" id="st-input-line-height-inherit" ${stCustomThemeSettings.inputLineHeightInherit ? 'checked' : ''}>
                                                <span class="st-theme-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                    <select id="st-input-line-height" style="width: 100%;" ${stCustomThemeSettings.inputLineHeightInherit ? 'disabled' : ''}>${renderLineHeightOptions(stCustomThemeSettings.inputLineHeight)}</select>
                                </div>
                            </div>
                            <div class="st-theme-divider"></div>

                            <div class="st-theme-section-header">
                                <h3>채팅 폰트</h3>
                            </div>
                            <div class="st-theme-setting-row">
                                <label>폰트</label>
                                <select id="st-chat-font">${renderFontOptions(stCustomThemeSettings.chatFont)}</select>
                            </div>
                            <div class="st-theme-setting-row st-theme-row-inline">
                                <div>
                                    <label>크기</label>
                                    <select id="st-chat-font-size">${renderFontSizeOptions(stCustomThemeSettings.chatFontSize)}</select>
                                </div>
                                <div>
                                    <label>굵기</label>
                                    <select id="st-chat-font-weight">
                                        <option value="" ${!stCustomThemeSettings.chatFontWeight ? 'selected' : ''}>기본값</option>
                                        <option value="100" ${stCustomThemeSettings.chatFontWeight == 100 ? 'selected' : ''}>100 (Thin)</option>
                                        <option value="200" ${stCustomThemeSettings.chatFontWeight == 200 ? 'selected' : ''}>200 (ExtraLight)</option>
                                        <option value="300" ${stCustomThemeSettings.chatFontWeight == 300 ? 'selected' : ''}>300 (Light)</option>
                                        <option value="400" ${stCustomThemeSettings.chatFontWeight == 400 ? 'selected' : ''}>400 (Regular)</option>
                                        <option value="500" ${stCustomThemeSettings.chatFontWeight == 500 ? 'selected' : ''}>500 (Medium)</option>
                                        <option value="600" ${stCustomThemeSettings.chatFontWeight == 600 ? 'selected' : ''}>600 (SemiBold)</option>
                                        <option value="700" ${stCustomThemeSettings.chatFontWeight == 700 ? 'selected' : ''}>700 (Bold)</option>
                                        <option value="800" ${stCustomThemeSettings.chatFontWeight == 800 ? 'selected' : ''}>800 (ExtraBold)</option>
                                        <option value="900" ${stCustomThemeSettings.chatFontWeight == 900 ? 'selected' : ''}>900 (Black)</option>
                                    </select>
                                </div>
                                <div>
                                    <label>행간</label>
                                    <select id="st-chat-line-height">${renderLineHeightOptions(stCustomThemeSettings.chatLineHeight)}</select>
                                </div>
                            </div>

                            <div class="st-theme-divider"></div>

                            <div class="st-theme-section-header">
                                <h3>대사 폰트 ("..." 부분)</h3>
                            </div>
                            <p class="st-theme-muted" style="margin-bottom: 10px;">스위치를 켜면 채팅 폰트 설정과 동일하게 적용됩니다.</p>

                            <div class="st-theme-setting-row">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <label>폰트</label>
                                    <div style="font-size: 0.8em; display: flex; align-items: center; gap: 5px;">
                                        <label class="st-theme-switch" style="transform: scale(0.7);">
                                            <input type="checkbox" id="st-mes-text-font-inherit" ${stCustomThemeSettings.mesTextFontInherit ? 'checked' : ''}>
                                            <span class="st-theme-slider"></span>
                                        </label>
                                    </div>
                                </div>
                                <select id="st-mes-text-font" style="width: 100%;" ${stCustomThemeSettings.mesTextFontInherit ? 'disabled' : ''}>
                                    ${renderFontOptions(stCustomThemeSettings.mesTextFont)}
                                </select>
                            </div>

                            <div class="st-theme-setting-row st-theme-row-inline">
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                        <label>크기</label>
                                        <div style="font-size: 0.8em; display: flex; align-items: center; gap: 5px;">
                                            <label class="st-theme-switch" style="transform: scale(0.7);">
                                                <input type="checkbox" id="st-mes-text-font-size-inherit" ${stCustomThemeSettings.mesTextFontSizeInherit ? 'checked' : ''}>
                                                <span class="st-theme-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                    <select id="st-mes-text-font-size" style="width: 100%;" ${stCustomThemeSettings.mesTextFontSizeInherit ? 'disabled' : ''}>${renderFontSizeOptions(stCustomThemeSettings.mesTextFontSize)}</select>
                                </div>
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                        <label>굵기</label>
                                        <div style="font-size: 0.8em; display: flex; align-items: center; gap: 5px;">
                                            <label class="st-theme-switch" style="transform: scale(0.7);">
                                                <input type="checkbox" id="st-mes-text-font-weight-inherit" ${stCustomThemeSettings.mesTextFontWeightInherit ? 'checked' : ''}>
                                                <span class="st-theme-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                    <select id="st-mes-text-font-weight" style="width: 100%;" ${stCustomThemeSettings.mesTextFontWeightInherit ? 'disabled' : ''}>
                                        <option value="" ${!stCustomThemeSettings.mesTextFontWeight ? 'selected' : ''}>기본값</option>
                                        <option value="100" ${stCustomThemeSettings.mesTextFontWeight == 100 ? 'selected' : ''}>100</option>
                                        <option value="200" ${stCustomThemeSettings.mesTextFontWeight == 200 ? 'selected' : ''}>200</option>
                                        <option value="300" ${stCustomThemeSettings.mesTextFontWeight == 300 ? 'selected' : ''}>300</option>
                                        <option value="400" ${stCustomThemeSettings.mesTextFontWeight == 400 ? 'selected' : ''}>400</option>
                                        <option value="500" ${stCustomThemeSettings.mesTextFontWeight == 500 ? 'selected' : ''}>500</option>
                                        <option value="600" ${stCustomThemeSettings.mesTextFontWeight == 600 ? 'selected' : ''}>600</option>
                                        <option value="700" ${stCustomThemeSettings.mesTextFontWeight == 700 ? 'selected' : ''}>700</option>
                                        <option value="800" ${stCustomThemeSettings.mesTextFontWeight == 800 ? 'selected' : ''}>800</option>
                                        <option value="900" ${stCustomThemeSettings.mesTextFontWeight == 900 ? 'selected' : ''}>900</option>
                                    </select>
                                </div>
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                        <label>행간</label>
                                        <div style="font-size: 0.8em; display: flex; align-items: center; gap: 5px;">
                                            <label class="st-theme-switch" style="transform: scale(0.7);">
                                                <input type="checkbox" id="st-mes-text-line-height-inherit" ${stCustomThemeSettings.mesTextLineHeightInherit ? 'checked' : ''}>
                                                <span class="st-theme-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                    <select id="st-mes-text-line-height" style="width: 100%;" ${stCustomThemeSettings.mesTextLineHeightInherit ? 'disabled' : ''}>${renderLineHeightOptions(stCustomThemeSettings.mesTextLineHeight)}</select>
                                </div>
                            </div>

                            <div class="st-theme-divider"></div>

                            <div class="st-theme-section-header">
                                <h3>커스텀 폰트</h3>
                                <button id="st-add-font-btn" class="st-theme-btn-small"><i class="fa-solid fa-plus"></i> 추가</button>
                            </div>
                            <div id="st-custom-font-list">${renderCustomFontList()}</div>
                        </div>
                    </div>

                    <!-- 1. General -->
                    <div class="st-theme-tab-content active" data-tab="general">
                        <h2>일반 설정</h2>

                        <div class="st-theme-setting-row">
                            <label>테마 모드</label>
                            <div class="st-theme-toggle-group">
                                <button class="st-theme-mode-btn ${!stCustomThemeSettings.darkMode ? 'active' : ''}" data-mode="light">
                                    <i class="fa-solid fa-sun"></i> 라이트
                                </button>
                                <button class="st-theme-mode-btn ${stCustomThemeSettings.darkMode ? 'active' : ''}" data-mode="dark">
                                    <i class="fa-solid fa-moon"></i> 다크
                                </button>
                            </div>
                        </div>

                        <div class="st-theme-setting-row">
                            <label>테마 색상</label>
                            <div class="st-theme-color-picker">
                                <input type="color" id="st-theme-color" value="${stCustomThemeSettings.hoverColor}">
                                <input type="text" id="st-theme-color-hex" value="${stCustomThemeSettings.hoverColor}"
                                    placeholder="#8b5cf6" maxlength="7" class="st-theme-hex-input">
                                <button id="st-theme-color-apply" class="st-theme-btn-small">적용</button>
                            </div>
                        </div>
                    </div>

                    <!-- 메뉴 설정 (통합됨) -->
                    <div class="st-theme-tab-content" data-tab="menu">
                        <h2>메뉴 설정</h2>



                        <!-- 1. 버튼 표시 (구 사이드바 설정) -->
                        <div class="st-sub-content active" data-sub="buttons">
                            <h3>표시할 버튼 선택</h3>
                            <p class="st-theme-muted">사이드바/메뉴에 표시할 버튼을 선택하세요.</p>
                            <div id="st-button-toggles">
                                ${(() => {
                // Check if Hamburger layout is active
                const mobile = isMobileView();
                const currentLayout = mobile ? stCustomThemeSettings.menuLayoutStyleMobile : stCustomThemeSettings.menuLayoutStylePC;
                const isHamburger = currentLayout === 'hamburger';

                let buttons = getButtonList();

                // Sort: If Hamburger mode, move 'rightNavHolder' to the very end
                if (isHamburger) {
                    const rightNavIndex = buttons.findIndex(b => b.id === 'rightNavHolder');
                    if (rightNavIndex > -1) {
                        const [rightNav] = buttons.splice(rightNavIndex, 1);
                        buttons.push(rightNav);
                    }
                }

                return buttons.map(btn => {
                    // Disable Right Nav (Character Management) in Hamburger mode
                    const isRightNav = btn.id === 'rightNavHolder';
                    const disabled = isHamburger && isRightNav;
                    // If disabled (Hamburger mode), force checked
                    const isChecked = disabled ? true : !stCustomThemeSettings.hiddenButtons.includes(btn.id);
                    const tooltip = disabled ? 'title="햄버거 메뉴에서는 캐릭터 관리가 별도로 표시되므로 비활성화됩니다."' : '';

                    return `
                                                <div class="st-theme-toggle-row" ${tooltip} style="${disabled ? 'opacity: 0.5;' : ''}">
                                                    <span>${btn.name}</span>
                                                    <label class="st-theme-switch">
                                                        <input type="checkbox" data-btn-id="${btn.id}"
                                                            ${isChecked ? 'checked' : ''}
                                                            ${disabled ? 'disabled' : ''}>
                                                        <span class="st-theme-slider"></span>
                                                    </label>
                                                </div>
                                            `;
                }).join('');
            })()
            }
                            </div>
                        </div>

                        <!-- 2. 레이아웃 -->
                        <div class="st-sub-content" data-sub="layout">
                            <h3>메뉴 레이아웃</h3>
                            <div class="st-theme-setting-row st-theme-row-inline">
                                <div>
                                    <label>PC 메뉴 형태</label>
                                    <select id="st-menu-layout-style-pc">
                                        <option value="sidebar" ${stCustomThemeSettings.menuLayoutStylePC === 'sidebar' ? 'selected' : ''}>사이드바</option>
                                        <option value="hamburger" ${stCustomThemeSettings.menuLayoutStylePC === 'hamburger' ? 'selected' : ''}>햄버거 메뉴</option>
                                    </select>
                                </div>
                                <div>
                                    <label>모바일 메뉴 형태</label>
                                    <select id="st-menu-layout-style-mobile">
                                        <option value="sidebar" ${stCustomThemeSettings.menuLayoutStyleMobile === 'sidebar' ? 'selected' : ''}>사이드바</option>
                                        <option value="hamburger" ${stCustomThemeSettings.menuLayoutStyleMobile === 'hamburger' ? 'selected' : ''}>햄버거 메뉴</option>
                                    </select>
                                </div>
                            </div>
                            <p class="st-theme-muted">현재 화면: <strong id="st-current-view-info">${isMobileView() ? '모바일' : 'PC'}</strong> | 적용된 클래스: <code id="st-menu-layout-class-info"></code></p>
                        </div>

                        <!-- 3. 아이콘 설정 -->
                        <div class="st-sub-content" data-sub="icons">
                            <h3>메뉴 아이콘 설정</h3>
                            <p class="st-theme-muted">메뉴 버튼의 아이콘 테마를 선택합니다.</p>

                            <div id="st-icon-pack-selector" class="st-icon-pack-grid">
                                ${Object.entries(MENU_ICON_PACKS).map(([key, pack]) => {
                const isActive = stCustomThemeSettings.menuIconPack === key;
                // Get preview icons (first 5)
                const previewIcons = key === 'default'
                    ? ['fa-solid fa-sliders', 'fa-solid fa-plug', 'fa-solid fa-font', 'fa-solid fa-book-atlas', 'fa-solid fa-cubes']
                    : Object.values(pack.icons).slice(0, 5).map(iconData => iconData.preview);

                return `
                                        <button class="st-icon-pack-btn ${isActive ? 'active' : ''}" data-pack="${key}">
                                            <div class="st-icon-pack-preview">
                                                ${previewIcons.map(icon => `<i class="${icon}"></i>`).join('')}
                                            </div>
                                            <span class="st-icon-pack-name">${pack.name}</span>
                                        </button>
                                    `;
            }).join('')}
                            </div>
                        </div>

                        <!-- 4. 기타 설정 -->
                        <div class="st-sub-content" data-sub="others">
                            <h3>기타 동작</h3>
                            ${(() => {
                // Check layout logic for Prevent Click Outside
                const mobile = isMobileView();
                const currentLayout = mobile ? stCustomThemeSettings.menuLayoutStyleMobile : stCustomThemeSettings.menuLayoutStylePC;
                const isHamburger = currentLayout === 'hamburger';

                const disabled = isHamburger;
                const isChecked = disabled ? false : stCustomThemeSettings.preventClickOutsideClose;
                const tooltip = disabled ? 'title="햄버거 메뉴에서는 이 기능을 사용할 수 없습니다."' : '';

                return `
                                <div class="st-theme-toggle-row" ${tooltip} style="${disabled ? 'opacity: 0.5;' : ''}">
                                    <span>메뉴 밖 클릭 시 닫힘 방지</span>
                                    <label class="st-theme-switch">
                                        <input type="checkbox" id="st-prevent-click-outside"
                                            ${isChecked ? 'checked' : ''}
                                            ${disabled ? 'disabled' : ''}>
                                        <span class="st-theme-slider"></span>
                                    </label>
                                </div>
                                `;
            })()}
                            <p class="st-theme-muted">활성화 시 메뉴 밖을 클릭해도 메뉴가 닫히지 않습니다. (잠금 기능이 있는 메뉴 제외)</p>
                        </div>
                    </div>

                    <!-- 4. Window (Former Icons/Tab & Icons) -->
                    <div class="st-theme-tab-content" data-tab="window">
                        <h2>창 설정 (브라우저/앱)</h2>
                        <p class="st-theme-muted">브라우저 탭 이름과 아이콘을 변경합니다.</p>

                        <div class="st-theme-setting-row">
                            <label>탭 이름 (브라우저 제목)</label>
                            <input type="text" id="st-tab-title-input" value="${stCustomThemeSettings.customTabTitle || ''}" placeholder="기본값: SillyTavern">
                        </div>

                        <div class="st-theme-setting-row">
                            <label>웹앱 이름 (홈 화면 추가 시)</label>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <input type="text" id="st-webapp-name-input" value="${stCustomThemeSettings.customWebAppName || ''}" placeholder="기본값: SillyTavern" style="flex: 1;" ${stCustomThemeSettings.webAppNameSameAsTab ? 'disabled' : ''}>
                                <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                                    <span style="font-size: 0.85em; color: #91918e;">탭 이름과 동일</span>
                                    <label class="st-theme-switch" style="transform: scale(0.85);">
                                        <input type="checkbox" id="st-webapp-name-same-as-tab" ${stCustomThemeSettings.webAppNameSameAsTab ? 'checked' : ''}>
                                        <span class="st-theme-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <p class="st-theme-muted">* 웹앱 이름은 앱 설치 시 적용됩니다. 기존 앱은 재설치해야 반영됩니다.</p>

                        <div class="st-theme-divider"></div>

                        <p class="st-theme-muted" style="font-size: 0.9em;">* 이미지는 자동으로 192x192px 크기로 리사이징되어 저장됩니다.</p>

                        <div class="st-theme-setting-row" style="align-items: flex-start;">
                            <div style="flex: 1;">
                                <label>파비콘 (탭 아이콘)</label>
                                <div class="st-theme-file-input-group">
                                    <input type="file" id="st-favicon-upload" accept="image/*" style="display: none;">
                                    <button class="st-theme-btn" onclick="$('#st-favicon-upload').click()">
                                        <i class="fa-solid fa-upload"></i> 이미지 업로드
                                    </button>
                                    <button id="st-favicon-reset" class="st-theme-btn-icon" title="기본값으로 복원">
                                        <i class="fa-solid fa-rotate-left"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="st-icon-preview">
                                <img id="st-favicon-preview" src="${stCustomThemeSettings.customFavicon || 'favicon.ico'}"
                                     style="width: 32px; height: 32px; border-radius: 4px; border: 1px solid #444;">
                            </div>
                        </div>

                        <div class="st-theme-divider"></div>

                        <div class="st-theme-setting-row" style="align-items: flex-start;">
                            <div style="flex: 1;">
                                <label>웹앱 아이콘 (홈 화면)</label>
                                <div class="st-theme-file-input-group">
                                    <input type="file" id="st-webapp-icon-upload" accept="image/*" style="display: none;">
                                    <button class="st-theme-btn" onclick="$('#st-webapp-icon-upload').click()">
                                        <i class="fa-solid fa-upload"></i> 이미지 업로드
                                    </button>
                                    <button id="st-webapp-icon-reset" class="st-theme-btn-icon" title="기본값으로 복원">
                                        <i class="fa-solid fa-rotate-left"></i>
                                    </button>
                                </div>
                                <p class="st-theme-muted" style="margin-top: 5px;">iOS 및 Android '홈 화면에 추가' 시 적용됩니다.</p>
                            </div>
                            <div class="st-icon-preview">
                                <img id="st-webapp-icon-preview" src="${stCustomThemeSettings.customWebAppIcon || 'img/apple-icon-144x144.png'}"
                                     style="width: 64px; height: 64px; border-radius: 12px; border: 1px solid #444;">
                            </div>
                        </div>
                    </div>

                    <!-- 5. Chat -->
                    <div class="st-theme-tab-content" data-tab="chat">
                        <h2>채팅 설정</h2>
                        <div class="st-theme-setting-row">
                            <label>입력창 Placeholder</label>
                            <input type="text" id="st-send-textarea-placeholder"
                                value="${stCustomThemeSettings.sendTextareaPlaceholder || ''}"
                                placeholder="메시지를 입력하세요...">
                        </div>
                        <p class="st-theme-muted">채팅 입력창에 표시될 안내 문구를 설정합니다. 비워두면 기본값이 사용됩니다.</p>

                        <div class="st-theme-divider"></div>

                        <div class="st-theme-toggle-row">
                            <span>입력창 맞춤법 검사 끄기</span>
                            <label class="st-theme-switch">
                                <input type="checkbox" id="st-spellcheck-enabled" ${stCustomThemeSettings.spellcheckEnabled ? 'checked' : ''}>
                                <span class="st-theme-slider"></span>
                            </label>
                        </div>
                        <p class="st-theme-muted">채팅 입력창의 맞춤법 검사 기능(빨간 밑줄 등)을 켜거나 끕니다.</p>

                        <div class="st-theme-divider"></div>

                        <div class="st-theme-toggle-row">
                            <span>메시지 작업 버튼 꺼내기</span>
                            <label class="st-theme-switch">
                                <input type="checkbox" id="st-show-extra-buttons" ${stCustomThemeSettings.alwaysShowExtraButtons ? 'checked' : ''}>
                                <span class="st-theme-slider"></span>
                            </label>
                        </div>
                        <p class="st-theme-muted">메시지 작업 버튼(수정, 복사 등)을 항상 펼쳐진 상태로 표시합니다.</p>

                        <div class="st-theme-divider"></div>

                        <div class="st-theme-toggle-row">
                            <span>메시지 삭제 버튼 표시</span>
                            <label class="st-theme-switch">
                                <input type="checkbox" id="st-show-delete-button" ${stCustomThemeSettings.showDeleteButton ? 'checked' : ''}>
                                <span class="st-theme-slider"></span>
                            </label>
                        </div>
                        <p class="st-theme-muted">각 메시지에 휴지통 모양의 삭제 버튼을 추가합니다.</p>
                    </div>

                    <!-- 6. Tools (Extensions & Persona) -->
                    <div class="st-theme-tab-content" data-tab="tools">
                        <!-- Sub-content: Extensions -->
                        <div class="st-sub-content active" data-sub="extensions">
                        <h2>요술봉 메뉴 관리</h2>
                        <p class="st-theme-muted">요술봉 메뉴(확장 기능)에 표시할 항목을 선택합니다.<br>이 설정은 메뉴 텍스트를 기준으로 작동하므로, 번역 등으로 텍스트가 변경되면 다시 설정해야 할 수 있습니다.</p>

                        <div class="st-theme-divider"></div>

                        <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
                            <button id="st-refresh-extensions" class="st-theme-btn-small">
                                <i class="fa-solid fa-rotate"></i> 목록 새로고침
                            </button>
                        </div>

                        <div id="st-extension-list" class="st-extension-list-container" style="display: flex; flex-direction: column; gap: 8px; overflow-y: auto; padding-right: 5px;">
                        </div>
                    </div>

                        <!-- Sub-content: Persona -->
                        <div class="st-sub-content" data-sub="persona">
                        <h2>페르소나 관리</h2>
                        <p class="st-theme-muted">페르소나를 PNG 파일로 내보내거나 불러올 수 있습니다.</p>

                        <div class="st-theme-divider"></div>

                        <div class="st-theme-toggle-row">
                            <span>페르소나 내보내기/불러오기 기능</span>
                            <label class="st-theme-switch">
                                <input type="checkbox" id="st-persona-export-enabled" ${stCustomThemeSettings.personaExportEnabled ? 'checked' : ''}>
                                <span class="st-theme-slider"></span>
                            </label>
                        </div>
                        <p class="st-theme-muted">활성화 시 페르소나 관리 패널에 내보내기/불러오기 버튼이 나타납니다.</p>

                        <div class="st-theme-divider"></div>

                        <h3>사용 방법</h3>
                        <ul style="color: #91918e; font-size: 0.85rem; padding-left: 20px; line-height: 1.8;">
                            <li><strong>내보내기:</strong> 페르소나를 선택한 후 내보내기 버튼을 클릭하면 PNG 파일로 저장됩니다.</li>
                            <li><strong>불러오기:</strong> 내보낸 PNG 파일을 선택하면 새 페르소나로 추가됩니다.</li>
                            <li>내보낸 PNG 파일에는 페르소나 이름, 설명, 아바타가 포함됩니다.</li>
                        </ul>
                    </div> <!-- End sub-content persona -->
                    </div> <!-- End tools tab content -->
                </div>

            </div>
    </div>`;

        $('body').append(popupHtml);

        // Initialize modal class info
        updateModalClassInfo();

        // --- Extension List Logic ---
        function renderExtensionListItems() {
            const menu = document.getElementById('extensionsMenu');
            const container = $('#st-extension-list');

            if (!menu || menu.children.length === 0) {
                container.html(`<div style="padding: 20px; text-align: center; color: #888; background: rgba(0,0,0,0.05); border-radius: 8px;">
                                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 2em; margin-bottom: 10px; display: block;"></i>
                                    요술봉 메뉴를 찾을 수 없거나 비어 있습니다.<br>
                                    <br>
                                    실리태번의 <strong>확장 기능(Extensions)</strong> 메뉴를 클릭하면 목록이 자동으로 감지됩니다.
                                </div>`);
                return;
            }

            const children = Array.from(menu.children);
            const hiddenItems = stCustomThemeSettings.hiddenExtensionItems || [];

            const listHtml = children.map(child => {
                const text = child.innerText.trim();
                if (!text) return '';
                const isVisible = !hiddenItems.includes(text);

                return `
                    <div class="st-theme-toggle-row" style="padding: 8px 10px; border-bottom: 1px solid rgba(0,0,0,0.05);">
                        <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 10px;" title="${text}">${text}</span>
                        <label class="st-theme-switch" style="transform: scale(0.85);">
                            <input type="checkbox" class="st-extension-toggle" data-text="${text.replace(/"/g, '&quot;')}" ${isVisible ? 'checked' : ''}>
                            <span class="st-theme-slider"></span>
                        </label>
                    </div>
                `;
            }).join('');

            container.html(listHtml);
        }

        // Initial render
        renderExtensionListItems();

        // Refresh Button - also applies visibility settings
        $('#st-refresh-extensions').on('click', function () {
            renderExtensionListItems();
            applyExtensionVisibility();
        });

        // Note: MutationObserver removed to prevent flickering issues
        // User can manually refresh the list with the refresh button

        // Re-attach event listeners for toggles (delegated)
        $('#st-extension-list').on('change', '.st-extension-toggle', function () {
            const text = $(this).data('text');
            const isVisible = $(this).is(':checked');

            if (!stCustomThemeSettings.hiddenExtensionItems) {
                stCustomThemeSettings.hiddenExtensionItems = [];
            }

            if (isVisible) {
                stCustomThemeSettings.hiddenExtensionItems = stCustomThemeSettings.hiddenExtensionItems.filter(item => item !== text);
            } else {
                if (!stCustomThemeSettings.hiddenExtensionItems.includes(text)) {
                    stCustomThemeSettings.hiddenExtensionItems.push(text);
                }
            }
            saveSettings();
            applyExtensionVisibility();
        });

        // Tab switching (Main Sidebar)
        // Tab switching (Main Sidebar)
        $('.st-theme-tab').on('click', function () {
            const tabId = $(this).data('tab');
            // Reset scroll position to top
            $('.st-theme-popup-main').scrollTop(0);

            // UI Active State
            $('.st-theme-tab').removeClass('active');
            $(this).addClass('active');

            // Show Content
            $('.st-theme-tab-content').removeClass('active');
            $(`.st-theme-tab-content[data-tab="${tabId}"]`).addClass('active');

            // Handle Sub-groups Logic (Menu & Tools)
            $('.st-theme-sub-group').removeClass('expanded');

            if (tabId === 'menu') {
                $('#st-sub-menu-group').addClass('expanded');
                // Ensure correct sub-content is shown
                let activeSub = $('#st-sub-menu-group .st-theme-sub-item.active').data('sub');
                if (!activeSub) {
                    activeSub = 'buttons';
                    $('#st-sub-menu-group .st-theme-sub-item[data-sub="buttons"]').addClass('active');
                }
                $('.st-sub-content').removeClass('active');
                $(`.st-sub-content[data-sub="${activeSub}"]`).addClass('active');
            }
            else if (tabId === 'tools') {
                $('#st-sub-tools-group').addClass('expanded');
                // Ensure correct sub-content is shown
                let activeSub = $('#st-sub-tools-group .st-theme-sub-item.active').data('sub');
                if (!activeSub) {
                    activeSub = 'extensions';
                    $('#st-sub-tools-group .st-theme-sub-item[data-sub="extensions"]').addClass('active');
                }
                $('.st-sub-content').removeClass('active');
                $(`.st-sub-content[data-sub="${activeSub}"]`).addClass('active');
            }
        });

        // Sub-Item switching (Menu & Tools Accordion)
        $('.st-theme-sub-item').on('click', function () {
            const subId = $(this).data('sub');
            const parentGroup = $(this).closest('.st-theme-sub-group');
            let parentTabId = '';

            if (parentGroup.attr('id') === 'st-sub-menu-group') parentTabId = 'menu';
            if (parentGroup.attr('id') === 'st-sub-tools-group') parentTabId = 'tools';

            // Set active item in this group
            if (parentTabId) {
                $(`#st-sub-${parentTabId}-group .st-theme-sub-item`).removeClass('active');
            }
            $(this).addClass('active');

            // Ensure Parent tab is active (if clicked directly)
            if (parentTabId) {
                $('.st-theme-tab').removeClass('active');
                $(`.st-theme-tab[data-tab="${parentTabId}"]`).addClass('active');
                $('.st-theme-tab-content').removeClass('active');
                $(`.st-theme-tab-content[data-tab="${parentTabId}"]`).addClass('active');
            }

            // Show sub-content
            $('.st-sub-content').removeClass('active');
            $(`.st-sub-content[data-sub="${subId}"]`).addClass('active');
        });

        // Font selection
        // Font settings enabled toggle
        $('#st-font-settings-enabled').on('change', function () {
            stCustomThemeSettings.fontSettingsEnabled = $(this).is(':checked');
            if (stCustomThemeSettings.fontSettingsEnabled) {
                $('#st-font-settings-content').removeClass('st-disabled');
            } else {
                $('#st-font-settings-content').addClass('st-disabled');
            }
            saveSettings();
        });

        $('#st-ui-font').on('change', function () {
            stCustomThemeSettings.uiFont = $(this).val();
            saveSettings();
        });

        $('#st-ui-font-size').on('change', function () {
            const val = $(this).val();
            stCustomThemeSettings.uiFontSize = val ? parseFloat(val) : '';
            saveSettings();
        });

        $('#st-ui-font-weight').on('change', function () {
            const val = $(this).val();
            stCustomThemeSettings.uiFontWeight = val ? parseInt(val) : '';
            saveSettings();
        });

        $('#st-ui-line-height').on('change', function () {
            const val = $(this).val();
            stCustomThemeSettings.uiLineHeight = val ? parseFloat(val) : '';
            saveSettings();
        });

        // Input Font - Per Property Inheritance
        $('#st-input-font-inherit').on('change', function () {
            stCustomThemeSettings.inputFontInherit = $(this).is(':checked');
            $('#st-input-font').prop('disabled', stCustomThemeSettings.inputFontInherit);
            saveSettings();
        });

        $('#st-input-font-size-inherit').on('change', function () {
            stCustomThemeSettings.inputFontSizeInherit = $(this).is(':checked');
            $('#st-input-font-size').prop('disabled', stCustomThemeSettings.inputFontSizeInherit);
            saveSettings();
        });

        $('#st-input-font-weight-inherit').on('change', function () {
            stCustomThemeSettings.inputFontWeightInherit = $(this).is(':checked');
            $('#st-input-font-weight').prop('disabled', stCustomThemeSettings.inputFontWeightInherit);
            saveSettings();
        });

        $('#st-input-line-height-inherit').on('change', function () {
            stCustomThemeSettings.inputLineHeightInherit = $(this).is(':checked');
            $('#st-input-line-height').prop('disabled', stCustomThemeSettings.inputLineHeightInherit);
            saveSettings();
        });

        $('#st-input-font').on('change', function () {
            stCustomThemeSettings.inputFont = $(this).val();
            if (!stCustomThemeSettings.inputFontInherit) saveSettings();
        });

        $('#st-input-font-size').on('change', function () {
            const val = $(this).val();
            stCustomThemeSettings.inputFontSize = val ? parseFloat(val) : '';
            if (!stCustomThemeSettings.inputFontSizeInherit) saveSettings();
        });

        $('#st-input-font-weight').on('change', function () {
            const val = $(this).val();
            stCustomThemeSettings.inputFontWeight = val ? parseInt(val) : '';
            if (!stCustomThemeSettings.inputFontWeightInherit) saveSettings();
        });

        $('#st-input-line-height').on('change', function () {
            const val = $(this).val();
            stCustomThemeSettings.inputLineHeight = val ? parseFloat(val) : '';
            if (!stCustomThemeSettings.inputLineHeightInherit) saveSettings();
        });

        $('#st-chat-font').on('change', function () {
            stCustomThemeSettings.chatFont = $(this).val();
            saveSettings();
        });

        $('#st-chat-font-size').on('change', function () {
            const val = $(this).val();
            stCustomThemeSettings.chatFontSize = val ? parseFloat(val) : '';
            saveSettings();
        });

        $('#st-chat-font-weight').on('change', function () {
            const val = $(this).val();
            stCustomThemeSettings.chatFontWeight = val ? parseInt(val) : '';
            saveSettings();
        });

        $('#st-chat-line-height').on('change', function () {
            const val = $(this).val();
            stCustomThemeSettings.chatLineHeight = val ? parseFloat(val) : '';
            saveSettings();
        });

        // Dialogue Font - Per Property Inheritance
        $('#st-mes-text-font-inherit').on('change', function () {
            stCustomThemeSettings.mesTextFontInherit = $(this).is(':checked');
            $('#st-mes-text-font').prop('disabled', stCustomThemeSettings.mesTextFontInherit);
            saveSettings();
        });

        $('#st-mes-text-font-size-inherit').on('change', function () {
            stCustomThemeSettings.mesTextFontSizeInherit = $(this).is(':checked');
            $('#st-mes-text-font-size').prop('disabled', stCustomThemeSettings.mesTextFontSizeInherit);
            saveSettings();
        });

        $('#st-mes-text-font-weight-inherit').on('change', function () {
            stCustomThemeSettings.mesTextFontWeightInherit = $(this).is(':checked');
            $('#st-mes-text-font-weight').prop('disabled', stCustomThemeSettings.mesTextFontWeightInherit);
            saveSettings();
        });

        $('#st-mes-text-line-height-inherit').on('change', function () {
            stCustomThemeSettings.mesTextLineHeightInherit = $(this).is(':checked');
            $('#st-mes-text-line-height').prop('disabled', stCustomThemeSettings.mesTextLineHeightInherit);
            saveSettings();
        });

        $('#st-mes-text-font').on('change', function () {
            stCustomThemeSettings.mesTextFont = $(this).val();
            if (!stCustomThemeSettings.mesTextFontInherit) saveSettings();
        });

        $('#st-mes-text-font-size').on('change', function () {
            const val = $(this).val();
            stCustomThemeSettings.mesTextFontSize = val ? parseFloat(val) : '';
            if (!stCustomThemeSettings.mesTextFontSizeInherit) saveSettings();
        });

        $('#st-mes-text-font-weight').on('change', function () {
            const val = $(this).val();
            stCustomThemeSettings.mesTextFontWeight = val ? parseInt(val) : '';
            if (!stCustomThemeSettings.mesTextFontWeightInherit) saveSettings();
        });

        $('#st-mes-text-line-height').on('change', function () {
            const val = $(this).val();
            stCustomThemeSettings.mesTextLineHeight = val ? parseFloat(val) : '';
            if (!stCustomThemeSettings.mesTextLineHeightInherit) saveSettings();
        });


        // Font Preview
        function updateFontPreview() {
            // Helper to safe get value
            const getVal = (id) => $(id).val() || '';
            const setStyle = (id, prop, val, unit = '') => {
                const el = $(id)[0];
                if (el && val) {
                    el.style.setProperty(prop, val + unit, 'important');
                } else if (el) {
                    el.style.removeProperty(prop);
                }
            };

            // UI Font
            const uiFont = getVal('#st-ui-font');
            const uiSize = getVal('#st-ui-font-size');
            const uiWeight = getVal('#st-ui-font-weight');
            const uiLineHeight = getVal('#st-ui-line-height');

            const uiEl = '#st-preview-ui';
            setStyle(uiEl, 'font-family', uiFont ? `"${uiFont}", sans-serif` : '');
            setStyle(uiEl, 'font-size', uiSize, 'px');
            setStyle(uiEl, 'font-weight', uiWeight);
            setStyle(uiEl, 'line-height', uiLineHeight);

            // Input Font
            const inputInherit = $('#st-input-font-inherit').is(':checked');
            const inputSizeInherit = $('#st-input-font-size-inherit').is(':checked');
            const inputWeightInherit = $('#st-input-font-weight-inherit').is(':checked');
            const inputLineHeightInherit = $('#st-input-line-height-inherit').is(':checked');

            const inputFont = inputInherit ? uiFont : getVal('#st-input-font');
            const inputSize = inputSizeInherit ? uiSize : getVal('#st-input-font-size');
            const inputWeight = inputWeightInherit ? uiWeight : getVal('#st-input-font-weight');
            const inputLineHeight = inputLineHeightInherit ? uiLineHeight : getVal('#st-input-line-height');

            const inputEl = '#st-preview-input';
            setStyle(inputEl, 'font-family', inputFont ? `"${inputFont}", sans-serif` : '');
            setStyle(inputEl, 'font-size', inputSize, 'px');
            setStyle(inputEl, 'font-weight', inputWeight);
            setStyle(inputEl, 'line-height', inputLineHeight);

            // Chat Font
            const chatFont = getVal('#st-chat-font');
            const chatSize = getVal('#st-chat-font-size');
            const chatWeight = getVal('#st-chat-font-weight');
            const chatLineHeight = getVal('#st-chat-line-height');

            const chatEl = '#st-preview-chat';
            setStyle(chatEl, 'font-family', chatFont ? `"${chatFont}", sans-serif` : '');
            setStyle(chatEl, 'font-size', chatSize, 'px');
            setStyle(chatEl, 'font-weight', chatWeight);
            setStyle(chatEl, 'line-height', chatLineHeight);

            // Dialogue Font
            const mesInherit = $('#st-mes-text-font-inherit').is(':checked');
            const mesSizeInherit = $('#st-mes-text-font-size-inherit').is(':checked');
            const mesWeightInherit = $('#st-mes-text-font-weight-inherit').is(':checked');
            const mesLineHeightInherit = $('#st-mes-text-line-height-inherit').is(':checked');

            const mesFont = mesInherit ? chatFont : getVal('#st-mes-text-font');
            const mesSize = mesSizeInherit ? chatSize : getVal('#st-mes-text-font-size');
            const mesWeight = mesWeightInherit ? chatWeight : getVal('#st-mes-text-font-weight');
            const mesLineHeight = mesLineHeightInherit ? chatLineHeight : getVal('#st-mes-text-line-height');

            const mesEl = '#st-preview-dialogue';
            setStyle(mesEl, 'font-family', mesFont ? `"${mesFont}", sans-serif` : '');
            setStyle(mesEl, 'font-size', mesSize, 'px');
            setStyle(mesEl, 'font-weight', mesWeight);
            setStyle(mesEl, 'line-height', mesLineHeight);

            // Update Sticky Preview as well
            const stickySuffix = '-sticky';
            setStyle(uiEl + stickySuffix, 'font-family', uiFont ? `"${uiFont}", sans-serif` : '');
            setStyle(uiEl + stickySuffix, 'font-size', uiSize, 'px');
            setStyle(uiEl + stickySuffix, 'font-weight', uiWeight);
            setStyle(uiEl + stickySuffix, 'line-height', uiLineHeight);

            setStyle(inputEl + stickySuffix, 'font-family', inputFont ? `"${inputFont}", sans-serif` : '');
            setStyle(inputEl + stickySuffix, 'font-size', inputSize, 'px');
            setStyle(inputEl + stickySuffix, 'font-weight', inputWeight);
            setStyle(inputEl + stickySuffix, 'line-height', inputLineHeight);

            setStyle(chatEl + stickySuffix, 'font-family', chatFont ? `"${chatFont}", sans-serif` : '');
            setStyle(chatEl + stickySuffix, 'font-size', chatSize, 'px');
            setStyle(chatEl + stickySuffix, 'font-weight', chatWeight);
            setStyle(chatEl + stickySuffix, 'line-height', chatLineHeight);

            setStyle(mesEl + stickySuffix, 'font-family', mesFont ? `"${mesFont}", sans-serif` : '');
            setStyle(mesEl + stickySuffix, 'font-size', mesSize, 'px');
            setStyle(mesEl + stickySuffix, 'font-weight', mesWeight);
            setStyle(mesEl + stickySuffix, 'line-height', mesLineHeight);
        }

        // Feature: Sticky Font Preview
        const popupMain = $('.st-theme-popup-main');
        const stickyOverlay = $('#st-sticky-overlay');
        const stickyTrigger = $('#st-sticky-preview-trigger');
        const stickyPanel = $('#st-sticky-preview-panel');
        const stickyClose = $('#st-sticky-close');

        let isPanelOpen = false;

        // Ensure elements are initially hidden (clean slate)
        stickyTrigger.removeClass('st-visible');
        stickyPanel.removeClass('st-visible');
        stickyOverlay.removeClass('st-visible');

        function checkStickyVisibility() {
            // Only active in Fonts tab
            if ($('.st-theme-tab.active').data('tab') !== 'fonts') {
                stickyTrigger.removeClass('st-visible');
                stickyPanel.removeClass('st-visible');
                stickyOverlay.removeClass('st-visible');
                return;
            }

            // Re-query original preview element (safe check)
            // Note: Use specific selector to avoid selecting the sticky clone which is now at the top
            const originalPreview = $('.st-theme-tab-content[data-tab="fonts"] .st-font-preview-card');
            if (!originalPreview.length) return;

            const previewBottom = originalPreview.offset().top + originalPreview.outerHeight();
            const containerTop = popupMain.offset().top;

            // "visible threshold": allow some buffer (e.g., 10px)
            const isScrolledOut = (previewBottom - 10) < containerTop;

            if (isScrolledOut) {
                if (isPanelOpen) {
                    stickyPanel.addClass('st-visible');
                    stickyOverlay.addClass('st-visible');
                    stickyTrigger.removeClass('st-visible');
                } else {
                    stickyTrigger.addClass('st-visible');
                    stickyPanel.removeClass('st-visible');
                    stickyOverlay.removeClass('st-visible');
                }
            } else {
                stickyTrigger.removeClass('st-visible');
                stickyPanel.removeClass('st-visible');
                stickyOverlay.removeClass('st-visible');
                isPanelOpen = false;
            }
        }

        popupMain.on('scroll', checkStickyVisibility);

        // Also check on tab switch (Font tab might be already scrolled)
        $('.st-theme-tab[data-tab="fonts"]').on('click', function () {
            setTimeout(checkStickyVisibility, 50);
        });

        stickyTrigger.on('click', function () {
            isPanelOpen = true;
            checkStickyVisibility();
        });

        const closeSticky = function () {
            isPanelOpen = false;
            checkStickyVisibility();
        };

        stickyClose.on('click', closeSticky);
        stickyOverlay.on('click', closeSticky);

        // Attach listeners (Use delegation or direct bind since inputs are static in popup)
        $('#st-font-settings-content').on('input change', 'input, select', updateFontPreview);

        // Initial update
        updateFontPreview();

        // Extension Menu Toggles
        $('.st-extension-toggle').on('change', function () {
            const text = $(this).data('text');
            const isVisible = $(this).is(':checked');

            if (!stCustomThemeSettings.hiddenExtensionItems) {
                stCustomThemeSettings.hiddenExtensionItems = [];
            }

            if (isVisible) {
                // Remove from hidden list
                stCustomThemeSettings.hiddenExtensionItems = stCustomThemeSettings.hiddenExtensionItems.filter(item => item !== text);
            } else {
                // Add to hidden list
                if (!stCustomThemeSettings.hiddenExtensionItems.includes(text)) {
                    stCustomThemeSettings.hiddenExtensionItems.push(text);
                }
            }
            saveSettings();
            applyExtensionVisibility();
        });

        // Add font button
        $('#st-add-font-btn').on('click', () => showFontModal());

        // Edit/Delete font
        $('#st-custom-font-list').on('click', '.st-font-edit', function () {
            const idx = $(this).closest('.st-theme-font-item').data('index');
            showFontModal(idx);
        });

        $('#st-custom-font-list').on('click', '.st-font-delete', function () {
            const idx = $(this).closest('.st-theme-font-item').data('index');
            stCustomThemeSettings.customFonts.splice(idx, 1);
            saveSettings();
            $('#st-custom-font-list').html(renderCustomFontList());
            $('#st-ui-font').html(renderFontOptions(stCustomThemeSettings.uiFont));
            $('#st-chat-font').html(renderFontOptions(stCustomThemeSettings.chatFont));
            $('#st-mes-text-font').html(renderFontOptions(stCustomThemeSettings.mesTextFont));
        });

        // Dark/Light mode
        $('.st-theme-mode-btn').on('click', function () {
            const mode = $(this).data('mode');
            stCustomThemeSettings.darkMode = (mode === 'dark');
            $('.st-theme-mode-btn').removeClass('active');
            $(this).addClass('active');
            saveSettings();
        });

        // Theme color (color picker) - hex input sync only, no save
        $('#st-theme-color').on('input', function () {
            const color = $(this).val();
            $('#st-theme-color-hex').val(color);
        });

        // Theme color (hex input) - color picker sync only, no save
        $('#st-theme-color-hex').on('input', function () {
            let color = $(this).val().trim();
            if (color && !color.startsWith('#')) {
                color = '#' + color;
            }
            if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                $('#st-theme-color').val(color);
            }
        });

        // Theme color apply button
        $('#st-theme-color-apply').on('click', function () {
            let color = $('#st-theme-color-hex').val().trim();
            if (color && !color.startsWith('#')) {
                color = '#' + color;
            }
            if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                stCustomThemeSettings.hoverColor = color;
                saveSettings();
                toastr.success('테마 색상이 적용되었습니다.');
            } else {
                toastr.warning('올바른 헥스 색상 코드를 입력해주세요. (예: #8b5cf6)');
            }
        });

        // Send textarea placeholder
        $('#st-send-textarea-placeholder').on('change', function () {
            stCustomThemeSettings.sendTextareaPlaceholder = $(this).val();
            saveSettings();
        });

        // Spellcheck Toggle
        $('#st-spellcheck-enabled').on('change', function () {
            stCustomThemeSettings.spellcheckEnabled = $(this).is(':checked');
            saveSettings();
            applySpellcheck();
        });

        // Message Buttons Toggle
        $('#st-show-extra-buttons').on('change', function () {
            stCustomThemeSettings.alwaysShowExtraButtons = $(this).is(':checked');
            saveSettings();
            applyExtraButtonsVisibility();
        });

        $('#st-show-delete-button').on('change', function () {
            stCustomThemeSettings.showDeleteButton = $(this).is(':checked');
            saveSettings();
        });

        // Button visibility toggles
        $('#st-button-toggles input[type="checkbox"]').on('change', function () {
            const btnId = $(this).data('btn-id');
            const isVisible = $(this).is(':checked');

            if (isVisible) {
                stCustomThemeSettings.hiddenButtons = stCustomThemeSettings.hiddenButtons.filter(id => id !== btnId);
            } else {
                if (!stCustomThemeSettings.hiddenButtons.includes(btnId)) {
                    stCustomThemeSettings.hiddenButtons.push(btnId);
                }
            }
            saveSettings();
            applyButtonVisibility();
        });

        // Prevent click outside close toggle
        $('#st-prevent-click-outside').on('change', function () {
            stCustomThemeSettings.preventClickOutsideClose = $(this).is(':checked');
            saveSettings();
        });

        // Icon pack selection
        $('#st-icon-pack-selector').on('click', '.st-icon-pack-btn', function () {
            const packName = $(this).data('pack');
            if (packName && packName !== stCustomThemeSettings.menuIconPack) {
                // Update active state
                $('.st-icon-pack-btn').removeClass('active');
                $(this).addClass('active');

                // Save and apply
                stCustomThemeSettings.menuIconPack = packName;
                saveSettings();
                applyMenuIconPack(packName);
            }
        });

        // Helper to update toggle state
        function updateLayoutDependentToggles() {
            const mobile = isMobileView();
            const currentLayout = mobile ? stCustomThemeSettings.menuLayoutStyleMobile : stCustomThemeSettings.menuLayoutStylePC;
            const isHamburger = currentLayout === 'hamburger';

            // 1. Right Nav Toggle (Character Management)
            const rightNavToggle = $('#st-button-toggles input[data-btn-id="rightNavHolder"]');
            const rightNavRow = rightNavToggle.closest('.st-theme-toggle-row');

            if (isHamburger) {
                // Hamburger Mode: Always ON (Checked) and Disabled
                rightNavToggle.prop('checked', true); // Force checked
                rightNavToggle.prop('disabled', true);
                rightNavRow.css('opacity', '0.5');
                rightNavRow.attr('title', '햄버거 메뉴에서는 캐릭터 관리가 별도로 표시되므로 비활성화됩니다.');
            } else {
                // Other Modes: Restore state from settings
                const isHidden = stCustomThemeSettings.hiddenButtons.includes('rightNavHolder');
                rightNavToggle.prop('checked', !isHidden); // Restore original state
                rightNavToggle.prop('disabled', false);
                rightNavRow.css('opacity', '1');
                rightNavRow.removeAttr('title');
            }

            // 2. Prevent Click Outside Toggle
            const clickOutsideToggle = $('#st-prevent-click-outside');
            const clickOutsideRow = clickOutsideToggle.closest('.st-theme-toggle-row');

            if (isHamburger) {
                // Hamburger Mode: Always OFF and Disabled
                clickOutsideToggle.prop('checked', false);
                clickOutsideToggle.prop('disabled', true);
                clickOutsideRow.css('opacity', '0.5');
                clickOutsideRow.attr('title', '햄버거 메뉴에서는 이 기능을 사용할 수 없습니다.');
            } else {
                // Other Modes: Restore state from settings
                clickOutsideToggle.prop('checked', stCustomThemeSettings.preventClickOutsideClose);
                clickOutsideToggle.prop('disabled', false);
                clickOutsideRow.css('opacity', '1');
                clickOutsideRow.removeAttr('title');
            }
        }

        // Menu layout style - PC
        $('#st-menu-layout-style-pc').on('change', function () {
            stCustomThemeSettings.menuLayoutStylePC = $(this).val();
            saveSettings();
            applyMenuClasses();
            updateLayoutDependentToggles();
        });

        // Menu layout style - Mobile
        $('#st-menu-layout-style-mobile').on('change', function () {
            stCustomThemeSettings.menuLayoutStyleMobile = $(this).val();
            saveSettings();
            applyMenuClasses();
            updateLayoutDependentToggles();
        });



        // Tab Title Handler
        $('#st-tab-title-input').on('change', function () {
            stCustomThemeSettings.customTabTitle = $(this).val();

            // Sync web app name input if "same as tab" is checked
            if (stCustomThemeSettings.webAppNameSameAsTab) {
                $('#st-webapp-name-input').val(stCustomThemeSettings.customTabTitle || '');
            }

            saveSettings();
            applyIconSettings();
        });

        // Web App Name Handler
        $('#st-webapp-name-input').on('change', function () {
            stCustomThemeSettings.customWebAppName = $(this).val();
            saveSettings();
            applyIconSettings();
        });

        // Web App Name Same As Tab Handler
        $('#st-webapp-name-same-as-tab').on('change', function () {
            const isChecked = $(this).is(':checked');
            stCustomThemeSettings.webAppNameSameAsTab = isChecked;

            // Update input field state and value
            const input = $('#st-webapp-name-input');
            if (isChecked) {
                input.prop('disabled', true);
                input.val(stCustomThemeSettings.customTabTitle || '');
            } else {
                input.prop('disabled', false);
            }

            saveSettings();
            applyIconSettings();
        });

        // Icon Handlers
        // Favicon
        $('#st-favicon-upload').on('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            // Reset input so same file can be selected again if cancelled
            $(this).val('');

            showCropModal(file, (base64) => {
                stCustomThemeSettings.customFavicon = base64;
                $('#st-favicon-preview').attr('src', base64);
                saveSettings();
                applyIconSettings();
                toastr.success('파비콘이 변경되었습니다.');
            });
        });

        $('#st-favicon-reset').on('click', function () {
            stCustomThemeSettings.customFavicon = '';
            $('#st-favicon-preview').attr('src', 'favicon.ico');
            saveSettings();
            applyIconSettings();
            toastr.info('파비콘이 초기화되었습니다.');
        });

        // WebApp Icon
        $('#st-webapp-icon-upload').on('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            // Reset input
            $(this).val('');

            showCropModal(file, (base64) => {
                stCustomThemeSettings.customWebAppIcon = base64;
                $('#st-webapp-icon-preview').attr('src', base64);
                saveSettings();
                applyIconSettings();
                toastr.success('웹앱 아이콘이 변경되었습니다.');
            });
        });

        $('#st-webapp-icon-reset').on('click', function () {
            stCustomThemeSettings.customWebAppIcon = '';
            $('#st-webapp-icon-preview').attr('src', 'img/apple-icon-144x144.png');
            saveSettings();
            applyIconSettings();
            toastr.info('웹앱 아이콘이 초기화되었습니다.');
        });

        // Persona export toggle
        $('#st-persona-export-enabled').on('change', function () {
            stCustomThemeSettings.personaExportEnabled = $(this).is(':checked');
            saveSettings();
            // Update button visibility via the loaded module
            if (window.STPersonaExport) {
                window.STPersonaExport.updateButtonVisibility();
            }
        });

        // Close handlers
        $('.st-theme-popup-close').on('click', function () {
            $('#st-custom-theme-popup').remove();
        });

        $('.st-theme-popup-overlay').on('click', function (e) {
            if (e.target === this) {
                $('#st-custom-theme-popup').remove();
            }
        });
    }

    // Font Modal
    function showFontModal(editIndex = null) {
        const isEdit = editIndex !== null;
        const font = isEdit ? stCustomThemeSettings.customFonts[editIndex] : { name: '', fontFace: '' };

        const modalHtml = `
        <div id="st-font-modal" class="st-theme-popup-overlay">
            <div class="st-theme-popup st-theme-popup-small">
                <div class="st-theme-popup-header">
                    <h3>${isEdit ? '폰트 수정' : '폰트 추가'}</h3>
                    <button class="st-theme-popup-close"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="st-theme-popup-content">
                    <div class="st-theme-setting-row">
                        <label>폰트 이름</label>
                        <input type="text" id="st-font-name" value="${font.name}" placeholder="예: Pretendard">
                    </div>
                    <div class="st-theme-setting-row">
                        <label>@font-face CSS</label>
                        <textarea id="st-font-face" rows="5" placeholder="@font-face { font-family: 'Pretendard'; src: url(...); }">${font.fontFace}</textarea>
                    </div>
                </div>
                <div class="st-theme-popup-footer">
                    <button id="st-font-save" class="st-theme-btn primary">${isEdit ? '저장' : '추가'}</button>
                    <button id="st-font-cancel" class="st-theme-btn">취소</button>
                </div>
            </div>
        </div>`;

        $('body').append(modalHtml);

        $('#st-font-save').on('click', () => {
            const name = $('#st-font-name').val().trim();
            const fontFace = $('#st-font-face').val().trim();

            if (!name) {
                toastr.warning('폰트 이름을 입력해주세요.');
                return;
            }

            // Extract font-family from @font-face CSS
            function extractFontFamily(css) {
                const match = css.match(/font-family\s*:\s*['"]?([^'";]+)['"]?\s*;?/i);
                return match ? match[1].trim() : null;
            }

            const fontFamily = extractFontFamily(fontFace) || name;

            if (isEdit) {
                stCustomThemeSettings.customFonts[editIndex] = { name, fontFace, fontFamily };
            } else {
                stCustomThemeSettings.customFonts.push({ name, fontFace, fontFamily });
            }

            saveSettings();
            $('#st-font-modal').remove();
            $('#st-custom-font-list').html(renderCustomFontList());
            $('#st-custom-font-list').html(renderCustomFontList());
            $('#st-ui-font').html(renderFontOptions(stCustomThemeSettings.uiFont));
            $('#st-chat-font').html(renderFontOptions(stCustomThemeSettings.chatFont));
            $('#st-mes-text-font').html(renderFontOptions(stCustomThemeSettings.mesTextFont));

            toastr.success(isEdit ? '폰트가 수정되었습니다.' : '폰트가 추가되었습니다.');
        });

        $('#st-font-cancel, #st-font-modal .st-theme-popup-close').on('click', () => {
            $('#st-font-modal').remove();
        });

        $('#st-font-modal.st-theme-popup-overlay').on('click', function (e) {
            if (e.target === this) {
                $('#st-font-modal').remove();
            }
        });
    }

    // Apply button visibility (only when needed)
    let lastHiddenButtonsState = '';
    function applyButtonVisibility() {
        const currentState = JSON.stringify(stCustomThemeSettings.hiddenButtons);

        // Skip if nothing changed
        if (currentState === lastHiddenButtonsState) {
            return;
        }
        lastHiddenButtonsState = currentState;

        // First, show all buttons
        $('#st-custom-sidebar .st-moved-drawer, #st-custom-sidebar .st-moved-button').removeClass('st-hidden');

        // Hide buttons that should be hidden
        stCustomThemeSettings.hiddenButtons.forEach(btnId => {
            // Special Case: In Hamburger mode, always show 'rightNavHolder'
            const mobile = isMobileView();
            const currentLayout = mobile ? stCustomThemeSettings.menuLayoutStyleMobile : stCustomThemeSettings.menuLayoutStylePC;
            const isHamburger = currentLayout === 'hamburger';

            if (isHamburger && btnId === 'rightNavHolder') {
                $(`#${btnId}`).removeClass('st-hidden');
                return;
            }

            $(`#${btnId}`).addClass('st-hidden');
        });

        // Safety check: ensure rightNavHolder is visible in hamburger mode even if not iterated above
        // (though the above handles user preference override, we also want to ensure default visibility)
        const mobile = isMobileView();
        const currentLayout = mobile ? stCustomThemeSettings.menuLayoutStyleMobile : stCustomThemeSettings.menuLayoutStylePC;
        if (currentLayout === 'hamburger') {
            $('#rightNavHolder').removeClass('st-hidden');
            // Refresh hamburger dropdown items to reflect visibility changes
            populateHamburgerDropdown();
        }
    }

    // 3. Theme Application Loop
    // We use a recurring check to ensure elements that are re-created by ST (like during chat load) are captured again.
    // Optimized: 5 second interval (was 2 seconds) - balances responsiveness with performance
    setInterval(applyTheme, 5000);
    applyTheme(); // Initial run

    function applyTheme() {
        // Enforce icons (checks internally if change needed)
        applyIconSettings();

        // Apply menu icon pack
        applyMenuIconPack(stCustomThemeSettings.menuIconPack);


        // Initialize Extension Menu Visibility Observer
        initExtensionMenuObserver();

        // Apply Message Buttons Visibility
        applyExtraButtonsVisibility();

        if (stCustomThemeSettings.enabled) {
            $('body').addClass('st-custom-theme-active');

            // Wrap #chat with a styled container if not already wrapped
            wrapChatContainer();

            // Add custom theme info below Custom CSS block
            const customCSSBlock = $('#CustomCSS-block');
            if (customCSSBlock.length > 0 && $('#st-custom-theme-info').length === 0) {
                customCSSBlock.after(`
                    <span id="st-custom-theme-info" class="st-theme-info-text">
                        <i class="fa-solid fa-info-circle"></i>
                        현재 커스텀 테마 확장을 사용 중입니다. <code>body.st-theme-dark</code>로 다크모드 CSS 설정이 가능합니다.
                    </span>
                `);
            }

            // Apply placeholder (needs to be in loop as ST may overwrite it)
            const sendTextarea = document.getElementById('send_textarea');
            if (sendTextarea) {
                // Placeholder
                if (stCustomThemeSettings.sendTextareaPlaceholder) {
                    const currentPlaceholder = sendTextarea.getAttribute('placeholder');
                    if (currentPlaceholder !== stCustomThemeSettings.sendTextareaPlaceholder) {
                        sendTextarea.setAttribute('placeholder', stCustomThemeSettings.sendTextareaPlaceholder);
                    }
                }
                // Spellcheck
                const isSpellcheckEnabled = stCustomThemeSettings.spellcheckEnabled !== false;
                // Coerce string "true"/"false" for robust comparison
                const currentSpellcheck = sendTextarea.getAttribute('spellcheck');
                const targetSpellcheck = isSpellcheckEnabled ? 'true' : 'false';
                if (currentSpellcheck !== targetSpellcheck) {
                    sendTextarea.setAttribute('spellcheck', targetSpellcheck);
                }
            }

            if (stCustomThemeSettings.modernSidebar) {
                // 현재 메뉴 레이아웃 확인
                const menuLayout = isMobileView() ?
                    stCustomThemeSettings.menuLayoutStyleMobile :
                    stCustomThemeSettings.menuLayoutStylePC;

                if (menuLayout === 'hamburger') {
                    // 햄버거 메뉴 모드
                    $('body').addClass('st-menu-layout-hamburger');
                    $('body').removeClass('st-custom-sidebar-active');
                    // 사이드바 제거
                    removeSidebar();
                    // 햄버거 메뉴 생성
                    injectHamburgerMenu();
                } else {
                    // 사이드바 모드 (기존)
                    $('body').addClass('st-custom-sidebar-active');
                    $('body').removeClass('st-menu-layout-hamburger');
                    // 햄버거 메뉴 제거
                    removeHamburgerMenu();
                    // 사이드바 생성 (약간의 딜레이로 iOS 타이밍 이슈 해결)
                    setTimeout(function () {
                        injectSidebar();
                        moveButtons();
                        applyButtonVisibility();
                    }, 50);
                }
            } else {
                $('body').removeClass('st-custom-sidebar-active st-menu-layout-hamburger');
                restoreButtons();
                removeSidebar();
                removeHamburgerMenu();
            }
        } else {
            $('body').removeClass('st-custom-theme-active st-custom-sidebar-active st-custom-hamburger-active');
            restoreButtons();
            removeSidebar();
            removeHamburgerMenu();
            // Unwrap #chat if it was wrapped
            unwrapChatContainer();
        }
    }

    function wrapChatContainer() {
        const chat = $('#chat');
        // Check if already wrapped
        if (chat.parent('#st-chat-wrapper').length > 0) {
            return;
        }
        // Wrap #chat with a styled div
        chat.wrap('<div id="st-chat-wrapper"></div>');
    }

    function unwrapChatContainer() {
        const chat = $('#chat');
        if (chat.parent('#st-chat-wrapper').length > 0) {
            chat.unwrap();
        }
    }

    function injectSidebar() {
        // MutationObserver: 다른 확장 프로그램이 나중에 추가하는 드로어/버튼 감지
        // 조기 리턴 전에 설정하여 사이드바가 이미 존재해도 observer가 동작하도록 함
        const topSettingsHolder = document.getElementById('top-settings-holder');
        if (topSettingsHolder && !window.stSidebarObserver) {
            window.stSidebarObserver = new MutationObserver(function (mutations) {
                let needsUpdate = false;
                let addedIds = [];
                mutations.forEach(function (mutation) {
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === 1 && (node.classList.contains('drawer') || node.classList.contains('menu_button'))) {
                            needsUpdate = true;
                            addedIds.push(node.id || node.className);
                        }
                    });
                });
                if (needsUpdate) {

                    setTimeout(function () {
                        moveButtons();
                        applyButtonVisibility();
                    }, 100);
                }
            });
            window.stSidebarObserver.observe(topSettingsHolder, { childList: true });

        }

        if ($('#st-custom-sidebar').length > 0) {
            $('#st-custom-sidebar').show();
            return;
        }

        const sidebarHtml = `
            <div id="st-custom-sidebar">
                <div class="st-sidebar-top" id="st-sidebar-top-container">
                    <div class="st-sidebar-item st-sidebar-toggle" id="st-sidebar-expand" title="메뉴 확장">
                        <i class="fa-solid fa-chevron-right"></i>
                    </div>
                    <!-- Moved buttons go here -->
                </div>

                <div class="st-sidebar-bottom" id="st-sidebar-bottom-container">
                    <div class="st-sidebar-item" id="st-btn-settings" title="Extension Settings">
                        <i class="fa-solid fa-gear"></i>
                    </div>
                </div>
            </div>
        `;
        $('body').append(sidebarHtml);

        // Bind settings button click
        $('#st-btn-settings').on('click', showSettingsPopup);

        // Bind expand button click
        $('#st-sidebar-expand').on('click', toggleSidebarExpanded);
    }

    function toggleSidebarExpanded() {
        const sidebar = $('#st-custom-sidebar');
        const isExpanded = sidebar.hasClass('st-sidebar-expanded');

        if (isExpanded) {
            sidebar.removeClass('st-sidebar-expanded');
            $('#st-sidebar-expand i').removeClass('fa-chevron-left').addClass('fa-chevron-right');
        } else {
            sidebar.addClass('st-sidebar-expanded');
            $('#st-sidebar-expand i').removeClass('fa-chevron-right').addClass('fa-chevron-left');
        }
    }

    function moveButtons() {
        const topContainer = $('#st-sidebar-top-container');
        const bottomContainer = $('#st-sidebar-bottom-container');

        // Move all drawers from #top-settings-holder to the sidebar
        $('#top-settings-holder > .drawer').each(function () {
            const drawer = $(this);
            if (drawer.closest('#st-custom-sidebar').length === 0) {
                const drawerId = drawer.attr('id') || 'unknown';
                drawer.addClass('st-moved-drawer');
                drawer.removeClass('st-hamburger-moved-drawer'); // 햄버거 클래스 제거

                // jQuery 클릭 이벤트 제거 (ST의 OpenNavPanels()가 trigger('click')으로 열지 못하게)
                const drawerToggle = drawer.find('.drawer-toggle');
                const drawerIcon = drawer.find('.drawer-icon');
                const drawerContent = drawer.find('.drawer-content');
                drawerToggle.off('click');
                drawerIcon.off('click');

                // 드로어를 닫힌 상태로 초기화 (ST가 열어놓은 상태일 수 있음)
                drawerContent.removeClass('openDrawer').addClass('closedDrawer');
                drawerIcon.removeClass('openIcon').addClass('closedIcon');
                drawerContent.removeAttr('style');

                // Add label if not exists
                if (drawer.find('.st-sidebar-label').length === 0) {
                    const fallbackTitle = drawer.find('.drawer-icon').attr('title');
                    const title = getMenuName(drawerId, fallbackTitle);
                    drawer.find('.drawer-toggle').append(`<span class="st-sidebar-label">${title}</span>`);
                }

                topContainer.append(drawer);
            }
        });

        // Fallback: Also check for any drawers anywhere in the DOM that should be in the sidebar
        // (iOS Safari might add drawers to different locations)
        $('body .drawer:not(.st-moved-drawer):not(.st-hamburger-moved-drawer)').each(function () {
            const drawer = $(this);
            // Skip if already in sidebar or hamburger holder
            if (drawer.closest('#st-custom-sidebar').length > 0) return;
            if (drawer.closest('#st-hamburger-drawer-holder').length > 0) return;
            if (drawer.closest('#st-hamburger-menu-bar').length > 0) return;

            // Skip rightNavHolder - handled separately
            if (drawer.attr('id') === 'rightNavHolder') return;

            const drawerId = drawer.attr('id') || 'unknown';
            drawer.addClass('st-moved-drawer');

            const drawerToggle = drawer.find('.drawer-toggle');
            const drawerIcon = drawer.find('.drawer-icon');
            const drawerContent = drawer.find('.drawer-content');
            drawerToggle.off('click');
            drawerIcon.off('click');

            drawerContent.removeClass('openDrawer').addClass('closedDrawer');
            drawerIcon.removeClass('openIcon').addClass('closedIcon');
            drawerContent.removeAttr('style');

            if (drawer.find('.st-sidebar-label').length === 0) {
                const fallbackTitle = drawer.find('.drawer-icon').attr('title');
                const title = getMenuName(drawerId, fallbackTitle);
                drawer.find('.drawer-toggle').append(`<span class="st-sidebar-label">${title}</span>`);
            }

            topContainer.append(drawer);
        });

        // Also move any standalone buttons
        $('#top-settings-holder > .menu_button, #top-settings-holder > [id^="rm_button_"]').each(function () {
            const btn = $(this);
            if (btn.closest('#st-custom-sidebar').length === 0 && !btn.hasClass('st-moved-button')) {
                const btnId = btn.attr('id') || 'unknown';
                btn.addClass('st-moved-button');

                // Add label if not exists
                if (btn.find('.st-sidebar-label').length === 0) {
                    const fallbackTitle = btn.attr('title');
                    const title = getMenuName(btnId, fallbackTitle);
                    btn.append(`<span class="st-sidebar-label">${title}</span>`);
                }

                topContainer.append(btn);
            }
        });
    }

    function restoreButtons() {
        // Move ALL drawers from sidebar back to #top-settings-holder (by location, not just class)
        $('#st-sidebar-top-container > .drawer').each(function () {
            const drawer = $(this);
            drawer.removeClass('st-moved-drawer');
            $('#top-settings-holder').append(drawer);
        });

        // Move buttons back to #top-settings-holder
        $('#st-sidebar-top-container > .menu_button, #st-sidebar-top-container > [id^="rm_button_"]').each(function () {
            const btn = $(this);
            btn.removeClass('st-moved-button');
            $('#top-settings-holder').append(btn);
        });
    }

    function removeSidebar() {
        restoreButtons();
        $('#st-custom-sidebar').remove();
    }

    // ============================================
    // 햄버거 메뉴 (Hamburger Menu) 관련 함수
    // ============================================

    function removeHamburgerMenu() {
        // drawer들을 먼저 원래 위치로 복원 (순서 중요: 일반 drawer들이 먼저 들어가고 rightNavHolder가 마지막에 가야 함)
        restoreDrawersFromHamburger();

        // #rightNavHolder를 원래 위치로 복원
        const rightNavHolder = $('.st-hamburger-moved-char');
        if (rightNavHolder.length > 0) {
            rightNavHolder.removeClass('st-hamburger-moved-char');
            // #top-settings-holder의 맨 끝으로 복원
            $('#top-settings-holder').append(rightNavHolder);

            // 햄버거 모드에서 추가된 이벤트 핸들러 정리 (필요하다면)
            // delegated event를 쓰면 여기서 정리할 필요 없음.
        }

        // 햄버거 메뉴 요소들 제거
        $('#st-hamburger-menu-bar').remove();
        $('#st-hamburger-dropdown').remove();
        $('#st-hamburger-drawer-holder').remove();
    }

    function injectHamburgerMenu() {
        // MutationObserver: 다른 확장 프로그램이 나중에 추가하는 드로어 감지
        // 조기 리턴 전에 설정하여 햄버거 메뉴가 이미 존재해도 observer가 동작하도록 함
        const topSettingsHolder = document.getElementById('top-settings-holder');
        if (topSettingsHolder && !window.stHamburgerObserver) {
            window.stHamburgerObserver = new MutationObserver(function (mutations) {
                let needsUpdate = false;
                let addedIds = [];
                mutations.forEach(function (mutation) {
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === 1 && node.classList.contains('drawer')) {
                            needsUpdate = true;
                            addedIds.push(node.id || node.className);
                        }
                    });
                });
                if (needsUpdate) {

                    setTimeout(function () {
                        moveDrawersToHamburger();
                        populateHamburgerDropdown();
                    }, 100);
                }
            });
            window.stHamburgerObserver.observe(topSettingsHolder, { childList: true });

        }

        // 드로어 이동 및 드롭다운 채우기 - 조기 리턴 전에 실행 (늦게 추가된 드로어 처리)
        if ($('#st-hamburger-drawer-holder').length > 0) {
            moveDrawersToHamburger();
            populateHamburgerDropdown();
        }

        // 이미 존재하면 다시 생성하지 않음
        if ($('#st-hamburger-menu-bar').length > 0) {
            return;
        }

        // 햄버거 메뉴 바 HTML (왼쪽: 햄버거 버튼, 오른쪽: #rightNavHolder가 이동될 자리)
        const hamburgerBarHtml = `
            <div id="st-hamburger-menu-bar">
                <button id="st-hamburger-btn" class="st-hamburger-btn" title="메뉴">
                    <i class="fa-solid fa-bars"></i>
                </button>
            </div>
        `;

        // 드롭다운 패널 HTML
        const dropdownHtml = `
            <div id="st-hamburger-dropdown" class="st-hamburger-dropdown">
                <div id="st-hamburger-dropdown-content"></div>
                <div class="st-hamburger-dropdown-footer">
                    <div class="st-dropdown-item" id="st-dropdown-settings">
                        <i class="fa-solid fa-gear"></i>
                        <span>확장 설정</span>
                    </div>
                </div>
            </div>
        `;

        // drawer를 담을 숨겨진 컨테이너 (사이드바 방식처럼 drawer를 여기로 이동)
        const drawerHolderHtml = `<div id="st-hamburger-drawer-holder"></div>`;

        // #sheld 최상단에 햄버거 바 삽입
        $('#sheld').prepend(hamburgerBarHtml);

        // 드롭다운은 햄버거 바 내부에 삽입
        $('#st-hamburger-menu-bar').append(dropdownHtml);

        // drawer holder를 body에 추가
        $('body').append(drawerHolderHtml);

        // #rightNavHolder를 햄버거 바로 이동 (사이드바와 동일한 방식)
        const rightNavHolder = $('#rightNavHolder');
        if (rightNavHolder.length > 0) {
            rightNavHolder.addClass('st-hamburger-moved-char');
            // 중복 이벤트 방지를 위해 기존 클릭 이벤트 제거
            rightNavHolder.find('.drawer-toggle').off('click');
            $('#st-hamburger-menu-bar').append(rightNavHolder);
        }

        // drawer들을 drawer holder로 이동 (rightNavHolder는 제외됨)
        moveDrawersToHamburger();

        // 드롭다운에 메뉴 아이템 추가
        populateHamburgerDropdown();

        // 이벤트 바인딩
        $('#st-hamburger-btn').on('click', toggleHamburgerDropdown);
        $('#st-dropdown-settings').on('click', function () {
            closeHamburgerDropdown();
            showSettingsPopup();
        });

        // 드롭다운 바깥 클릭 시 닫기
        $(document).on('click.hamburgerDropdown', function (e) {
            const dropdown = $('#st-hamburger-dropdown');
            if (!dropdown.hasClass('st-dropdown-open')) return;

            // 햄버거 버튼이나 드롭다운 내부 클릭은 무시
            if ($(e.target).closest('#st-hamburger-btn, #st-hamburger-dropdown').length > 0) return;

            closeHamburgerDropdown();
        });

        // 초기 로드 시 한 번만 drawer 닫기 (ST 초기화 후)
        if (!window.stHamburgerInitialized) {
            window.stHamburgerInitialized = true;
            setTimeout(function () {
                closeAllHamburgerDrawers();
            }, 1500);
        }

        // 드로어들을 햄버거 홀더로 이동하고 드롭다운 메뉴 채우기
        moveDrawersToHamburger();
        populateHamburgerDropdown();
    }

    function moveDrawersToHamburger() {
        const drawerHolder = $('#st-hamburger-drawer-holder');

        // #top-settings-holder의 모든 drawer를 drawerHolder로 이동
        $('#top-settings-holder > .drawer').each(function () {
            const drawer = $(this);
            if (drawer.closest('#st-hamburger-drawer-holder').length === 0) {
                drawer.addClass('st-hamburger-moved-drawer');

                // drawer를 닫힌 상태로 만들기
                const drawerContent = drawer.find('.drawer-content');
                const drawerIcon = drawer.find('.drawer-icon');
                const drawerToggle = drawer.find('.drawer-toggle');

                // jQuery 클릭 이벤트 제거 (ST의 OpenNavPanels()가 trigger('click')으로 열지 못하게)
                drawerToggle.off('click');
                drawerIcon.off('click');

                // 클래스 변경
                drawerContent.removeClass('openDrawer').addClass('closedDrawer');
                drawerIcon.removeClass('openIcon').addClass('closedIcon');

                // inline style 제거
                drawerContent.removeAttr('style');

                drawerHolder.append(drawer);
            }
        });

        // Fallback: Also check for any drawers anywhere in the DOM that should be in hamburger holder
        // (iOS Safari might add drawers to different locations)
        $('body .drawer:not(.st-moved-drawer):not(.st-hamburger-moved-drawer)').each(function () {
            const drawer = $(this);
            // Skip if already in sidebar or hamburger holder
            if (drawer.closest('#st-custom-sidebar').length > 0) return;
            if (drawer.closest('#st-hamburger-drawer-holder').length > 0) return;
            if (drawer.closest('#st-hamburger-menu-bar').length > 0) return;

            // Skip rightNavHolder - handled separately
            if (drawer.attr('id') === 'rightNavHolder') return;

            drawer.addClass('st-hamburger-moved-drawer');

            const drawerContent = drawer.find('.drawer-content');
            const drawerIcon = drawer.find('.drawer-icon');
            const drawerToggle = drawer.find('.drawer-toggle');

            drawerToggle.off('click');
            drawerIcon.off('click');

            drawerContent.removeClass('openDrawer').addClass('closedDrawer');
            drawerIcon.removeClass('openIcon').addClass('closedIcon');
            drawerContent.removeAttr('style');

            drawerHolder.append(drawer);

            // 드로어가 추가되면 드롭다운 메뉴도 갱신
            populateHamburgerDropdown();
        });
    }

    function restoreDrawersFromHamburger() {
        // Move ALL drawers from hamburger holder back to #top-settings-holder (by location, not just class)
        $('#st-hamburger-drawer-holder > .drawer').each(function () {
            const drawer = $(this);
            drawer.removeClass('st-hamburger-moved-drawer');
            $('#top-settings-holder').append(drawer);
        });
    }

    function closeAllHamburgerDrawers() {
        // 햄버거 drawer holder 내의 모든 drawer 닫기
        $('#st-hamburger-drawer-holder .drawer-content').each(function () {
            $(this).removeClass('openDrawer').addClass('closedDrawer');
        });
        $('#st-hamburger-drawer-holder .drawer-icon').each(function () {
            $(this).removeClass('openIcon').addClass('closedIcon');
        });

        // 캐릭터 관리 (rightNavHolder)도 닫기 (햄버거 메뉴 바로 이동된 상태)
        $('#rightNavHolder .drawer-content').removeClass('openDrawer').addClass('closedDrawer');
        $('#rightNavHolder .drawer-icon').removeClass('openIcon').addClass('closedIcon');
    }

    function populateHamburgerDropdown() {
        const dropdownContent = $('#st-hamburger-dropdown-content');
        dropdownContent.empty();

        // #st-hamburger-drawer-holder의 모든 drawer를 드롭다운 아이템으로 생성
        $('#st-hamburger-drawer-holder > .drawer').each(function () {
            const drawer = $(this);
            const drawerId = drawer.attr('id');

            // rightNavHolder(캐릭터 관리)는 제외 - 오른쪽 버튼으로 별도 처리
            if (drawerId === 'rightNavHolder') return;

            // hiddenButtons에 있으면 제외
            if (stCustomThemeSettings.hiddenButtons.includes(drawerId)) return;

            const fallbackTitle = drawer.find('.drawer-icon').attr('title');
            const title = getMenuName(drawerId, fallbackTitle);

            // 아이콘 클래스 추출
            const iconEl = drawer.find('.drawer-icon i');
            let iconClass = 'fa-solid fa-cog';
            if (iconEl.length > 0) {
                iconClass = iconEl.attr('class');
            } else {
                // drawer-icon 자체에 아이콘이 있을 수 있음
                const drawerIcon = drawer.find('.drawer-icon');
                const classes = drawerIcon.attr('class') || '';
                const faMatch = classes.match(/fa-[a-z-]+/g);
                if (faMatch && faMatch.length > 0) {
                    iconClass = 'fa-solid ' + faMatch.filter(c => c !== 'fa-fw').join(' ');
                }
            }

            // 드롭다운 아이템 생성
            const itemHtml = `
                <div class="st-dropdown-item" data-drawer-id="${drawerId}">
                    <i class="${iconClass}"></i>
                    <span>${title}</span>
                </div>
            `;

            dropdownContent.append(itemHtml);
        });

        // 드롭다운 아이템 클릭 이벤트 (document 레벨 이벤트 위임)
        $(document).off('click.hamburgerDropdown').on('click.hamburgerDropdown', '#st-hamburger-dropdown-content .st-dropdown-item', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const drawerId = $(this).data('drawer-id');

            if (drawerId) {
                openDrawerById(drawerId);
                closeHamburgerDropdown();
            }
        });
    }

    function toggleHamburgerDropdown() {
        if (window.innerWidth <= 1000) {
            // 화면 너비가 1000px 이하인 경우, 열려 있는지 확인
            const anyDrawerOpen = $('#st-hamburger-drawer-holder .drawer-content.openDrawer, #rightNavHolder .drawer-content.openDrawer').length > 0;
            if (anyDrawerOpen) {
                closeAllHamburgerDrawers();
                // 패널이 열려있더라도 드롭다운을 열기 위해 return 제거
            }
        }

        const dropdown = $('#st-hamburger-dropdown');
        const isOpen = dropdown.hasClass('st-dropdown-open');

        if (isOpen) {
            closeHamburgerDropdown();
        } else {
            dropdown.addClass('st-dropdown-open');
        }
    }

    function closeHamburgerDropdown() {
        $('#st-hamburger-dropdown').removeClass('st-dropdown-open');
    }

    function openCharacterPanel() {
        // 기존 rightNavHolder drawer 토글
        const rightNav = $('#rightNavHolder');
        const drawerContent = rightNav.find('.drawer-content');
        const drawerIcon = rightNav.find('.drawer-icon');

        if (drawerContent.hasClass('openDrawer')) {
            drawerContent.removeClass('openDrawer').addClass('closedDrawer');
            drawerIcon.removeClass('openIcon').addClass('closedIcon');
        } else {
            drawerContent.removeClass('closedDrawer').addClass('openDrawer');
            drawerIcon.removeClass('closedIcon').addClass('openIcon');
        }
    }

    function openDrawerById(drawerId) {
        const drawer = $(`#${drawerId}`);
        if (drawer.length === 0) return;

        const drawerContent = drawer.find('.drawer-content');
        const drawerIcon = drawer.find('.drawer-icon');

        // 다른 열린 drawer들 닫기
        $('.drawer-content.openDrawer').not(drawerContent).each(function () {
            const otherDrawer = $(this);
            if (!otherDrawer.hasClass('pinnedOpen')) {
                otherDrawer.removeClass('openDrawer').addClass('closedDrawer');
                otherDrawer.siblings('.drawer-toggle').find('.drawer-icon')
                    .removeClass('openIcon').addClass('closedIcon');
            }
        });

        // 해당 drawer 열기/닫기 토글
        if (drawerContent.hasClass('openDrawer')) {
            drawerContent.removeClass('openDrawer').addClass('closedDrawer');
            drawerIcon.removeClass('openIcon').addClass('closedIcon');
        } else {
            drawerContent.removeClass('closedDrawer').addClass('openDrawer');
            drawerIcon.removeClass('closedIcon').addClass('openIcon');
        }
    }

    // 4. Click Outside Prevention Logic
    // ST uses 'mousedown' event to close drawers (see script.js line 11297)
    // We intercept at mousedown in capture phase to prevent drawer closing
    document.addEventListener('mousedown', function (e) {
        if (!stCustomThemeSettings.preventClickOutsideClose) return;
        if (!stCustomThemeSettings.enabled) return;

        // Check if there's any open drawer
        const openDrawers = document.querySelectorAll('.drawer-content.openDrawer');
        if (openDrawers.length === 0) return;

        // If click is outside drawer content and its toggle, prevent default drawer close behavior
        const target = e.target;
        const isInsideDrawer = target.closest('.drawer-content, .drawer-toggle, .drawer-icon, #st-custom-sidebar, .popup, .ui-widget, #toast-container');

        if (!isInsideDrawer) {
            // Stop the event from reaching ST's default handlers that close drawers
            e.stopImmediatePropagation();
        }
    }, true); // Capture phase

    // 4-2. Protect other panels from closing when opening SIDE panels (preset, character management)
    // When clicking on side panel toggles, other open panels should NOT close
    // Use mousedown to run BEFORE the click handler
    const sidePanelIds = ['ai-config-button', 'rightNavHolder']; // Preset and Character Management

    document.addEventListener('mousedown', function (e) {
        if (!stCustomThemeSettings.enabled) return;

        const target = e.target;
        const drawerToggle = target.closest('.drawer-toggle');
        const drawerIcon = target.closest('.drawer-icon');

        if (drawerToggle || drawerIcon) {
            // Check if the clicked drawer is a side panel
            const clickedDrawer = (drawerToggle || drawerIcon).closest('.drawer');
            const clickedDrawerId = clickedDrawer ? clickedDrawer.id : null;
            const isClickingSidePanel = sidePanelIds.includes(clickedDrawerId);

            // Only protect other panels if clicking on a SIDE panel
            if (isClickingSidePanel) {
                // Protect ALL open drawers (except the one being clicked) from closing
                const openDrawers = document.querySelectorAll('.drawer-content.openDrawer:not(.pinnedOpen)');
                openDrawers.forEach(drawer => {
                    const parentDrawer = drawer.closest('.drawer');
                    if (parentDrawer && parentDrawer.id !== clickedDrawerId) {
                        drawer.classList.add('pinnedOpen');
                        drawer.classList.add('st-temp-pinned');
                    }
                });

                const openIcons = document.querySelectorAll('.drawer-icon.openIcon:not(.drawerPinnedOpen)');
                openIcons.forEach(icon => {
                    const parentDrawer = icon.closest('.drawer');
                    if (parentDrawer && parentDrawer.id !== clickedDrawerId) {
                        icon.classList.add('drawerPinnedOpen');
                        icon.classList.add('st-temp-pinned-icon');
                    }
                });
            }
        }
    }, true); // Capture phase

    // Remove temporary pinned class after click completes
    document.addEventListener('click', function (e) {
        // Clean up temporary pinned classes after a short delay
        setTimeout(() => {
            document.querySelectorAll('.drawer-content.st-temp-pinned').forEach(drawer => {
                drawer.classList.remove('pinnedOpen');
                drawer.classList.remove('st-temp-pinned');
            });
            document.querySelectorAll('.drawer-icon.st-temp-pinned-icon').forEach(icon => {
                icon.classList.remove('drawerPinnedOpen');
                icon.classList.remove('st-temp-pinned-icon');
            });
        }, 50);
    }, false); // Bubble phase - runs after everything

    // 햄버거 모드에서 drawer-toggle 클릭 차단 (Global)
    // SillyTavern의 OpenNavPanels()가 trigger('click')으로 drawer를 열려고 할 때 막음
    // 요소가 아직 이동되지 않았어도(body class 체크) 차단
    document.addEventListener('click', function (e) {
        // 현재 설정이 햄버거 모드인지 확인 (클래스 체크 + 설정 객체 체크)
        // applyTheme가 아직 안 돌았을 수도 있으므로 설정 객체도 체크
        const isHamburgerSetting = (window.stCustomThemeSettings && window.stCustomThemeSettings.enabled &&
            ((window.innerWidth <= 768 && window.stCustomThemeSettings.menuLayoutStyleMobile === 'hamburger') ||
                (window.innerWidth > 768 && window.stCustomThemeSettings.menuLayoutStylePC === 'hamburger')));

        const isHamburgerClass = document.body.classList.contains('st-menu-layout-hamburger');

        if (!isHamburgerSetting && !isHamburgerClass) return;

        const target = e.target;

        // 사이드바 내부 클릭은 허용 (사이드바 모드에서 이 핸들러가 방해하지 않도록)
        if (target.closest('#st-custom-sidebar')) return;

        // 모든 drawer toggle 및 icon 대상 (#st-hamburger-drawer-holder 내부 뿐만 아니라 전체)
        // #rightNavHolder 등 아직 이동되지 않은 요소도 포함
        const isDrawerToggle = target.closest('.drawer-toggle');
        const isDrawerIcon = target.closest('.drawer-icon');

        if (isDrawerToggle || isDrawerIcon) {
            // 햄버거 메뉴 바 내의 버튼이나 드롭다운 내의 아이템 클릭은 허용해야 함
            if (target.closest('#st-hamburger-menu-bar') || target.closest('#st-hamburger-dropdown')) {
                // 햄버거 메뉴 바 내부 클릭은 허용
            } else {
                // 햄버거 모드에서는 원래 위치의 버튼들에 대한 클릭 차단
                // ST의 자동 열림(trigger) 방지
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        }
    }, true); // Capture phase

    // 사이드바 모드에서 ST의 trigger('click') 차단 (OpenNavPanels() 자동 열기 방지)
    // jQuery trigger()로 발생한 이벤트만 차단, 실제 사용자 클릭은 허용
    $(document).on('click', '#st-custom-sidebar .drawer-toggle, #st-custom-sidebar .drawer-icon', function (e) {
        // jQuery trigger()로 발생한 이벤트는 originalEvent가 없거나 isTrigger 속성이 있음
        if (!e.originalEvent || e.isTrigger) {
            e.stopImmediatePropagation();
        }
    });

    // 햄버거 모드에서 #rightNavHolder의 trigger('click') 차단 (OpenNavPanels() 자동 열기 방지)
    $(document).on('click', '#st-hamburger-menu-bar #rightNavHolder .drawer-toggle, #st-hamburger-menu-bar #rightNavHolder .drawer-icon', function (e) {
        if (!e.originalEvent || e.isTrigger) {
            e.stopImmediatePropagation();
        }
    });

    // 햄버거 모드에서 #rightNavHolder 클릭 시 패널 토글 (사이드바에서 이벤트가 제거되었을 수 있으므로 별도 바인딩)
    $(document).on('click', '#st-hamburger-menu-bar #rightNavHolder .drawer-toggle', function (e) {
        // 실제 클릭인 경우에만 처리
        if (e.originalEvent && !e.isTrigger) {
            e.preventDefault();
            e.stopPropagation();
            openCharacterPanel();
        }
    });

    // 5. Sidebar Toggle Behavior
    // Use our own state tracking to avoid interference from other code
    let lastToggleTime = 0;
    $(document).on('click', '#st-custom-sidebar .st-moved-drawer .drawer-toggle', function (e) {
        // Ignore jQuery triggered events (e.g., from ST's OpenNavPanels)
        if (!e.originalEvent || e.isTrigger) {
            return false;
        }

        // Debounce: prevent double processing of same click event
        const now = Date.now();
        if (now - lastToggleTime < 100) {
            return false;
        }
        lastToggleTime = now;

        e.preventDefault();
        e.stopImmediatePropagation();

        // Find parent drawer elements
        const parentDrawer = $(this).closest('.st-moved-drawer');
        const drawerId = parentDrawer.attr('id');
        const icon = parentDrawer.find('.drawer-icon');
        const drawer = parentDrawer.find('.drawer-content');

        // Use our own state tracking (ST may interfere with classes)
        const isOpen = parentDrawer.attr('data-st-open') === 'true';

        // Close ALL other sidebar drawers first (except pinned ones)
        $('#st-custom-sidebar .st-moved-drawer').not(parentDrawer).each(function () {
            const otherDrawer = $(this);
            const otherContent = otherDrawer.find('.drawer-content');
            const otherIcon = otherDrawer.find('.drawer-icon');

            // Skip if this drawer is pinned
            if (otherContent.hasClass('pinnedOpen')) {
                return;
            }

            // Close it
            otherDrawer.attr('data-st-open', 'false');
            otherContent.removeClass('openDrawer').addClass('closedDrawer');
            otherIcon.removeClass('openIcon').addClass('closedIcon');
        });

        // Toggle this drawer
        if (isOpen) {
            // Close it
            parentDrawer.attr('data-st-open', 'false');
            icon.removeClass('openIcon').addClass('closedIcon');
            drawer.removeClass('openDrawer').addClass('closedDrawer');
        } else {
            // Open it
            parentDrawer.attr('data-st-open', 'true');
            icon.removeClass('closedIcon').addClass('openIcon');
            drawer.removeClass('closedDrawer').addClass('openDrawer');
        }

        return false; // Stop all propagation
    });

    // 6. World button handler - open World Info drawer directly
    // ST's openWorldInfoEditor uses trigger('click') which we block, so we handle it ourselves
    $(document).on('click', '#world_button', function () {
        if (!stCustomThemeSettings.enabled) return;

        // 1. Try to find the World Info drawer in the Sidebar
        let wiDrawer = $('#st-custom-sidebar .st-moved-drawer').filter(function () {
            return $(this).find('#WorldInfo').length > 0 || $(this).attr('id')?.includes('world') || $(this).attr('id')?.includes('WI');
        });

        // 2. If not found in sidebar, try to find in Hamburger holder
        let isHamburger = false;
        if (wiDrawer.length === 0) {
            wiDrawer = $('#st-hamburger-drawer-holder .drawer').filter(function () {
                return $(this).find('#WorldInfo').length > 0 || $(this).attr('id')?.includes('world') || $(this).attr('id')?.includes('WI');
            });
            isHamburger = wiDrawer.length > 0;
        }

        if (wiDrawer.length === 0) return;

        // Use setTimeout to let ST's handler run first (it loads the world info data)
        setTimeout(function () {
            // Hamburger Mode Strategy
            if (isHamburger) {
                const drawerId = wiDrawer.attr('id');
                if (drawerId) {
                    // Check if already open
                    const content = wiDrawer.find('.drawer-content');
                    if (!content.hasClass('openDrawer')) {
                        // Use the shared function for hamburger drawers
                        openDrawerById(drawerId);
                    }
                }
                return;
            }

            // Sidebar Mode Strategy (Existing Logic)
            const drawerContent = wiDrawer.find('.drawer-content');
            const drawerIcon = wiDrawer.find('.drawer-icon');

            // Skip if already open
            if (drawerContent.hasClass('openDrawer')) return;

            // Close other drawers (except pinned)
            $('#st-custom-sidebar .st-moved-drawer').not(wiDrawer).each(function () {
                const otherDrawer = $(this);
                const otherContent = otherDrawer.find('.drawer-content');
                const otherIcon = otherDrawer.find('.drawer-icon');
                if (!otherContent.hasClass('pinnedOpen')) {
                    otherDrawer.attr('data-st-open', 'false');
                    otherContent.removeClass('openDrawer').addClass('closedDrawer');
                    otherIcon.removeClass('openIcon').addClass('closedIcon');
                }
            });

            // Open the World Info drawer
            wiDrawer.attr('data-st-open', 'true');
            drawerContent.removeClass('closedDrawer').addClass('openDrawer');
            drawerIcon.removeClass('closedIcon').addClass('openIcon');
        }, 150);
    });

    // 7. #rightNavHolder .list-group 드롭다운 처리
    // CSS에서 위치 지정만 함 (style.css 참조)
    // 다른 확장이 자체적으로 열기/닫기 처리

    // 8. 테이블 보기 버튼을 아이콘으로 변경
    function convertTableButtonToIcon() {
        $('.open_table_by_id').each(function () {
            const $btn = $(this);
            // 이미 변환된 경우 스킵
            if ($btn.hasClass('fa-solid')) return;
            // 텍스트가 "표"인 경우만 변환
            if ($btn.text().trim() === '표') {
                $btn.addClass('fa-solid fa-table').text('');
            }
        });
    }

    // 초기 실행 및 DOM 변경 감지
    convertTableButtonToIcon();

    // MutationObserver로 동적으로 추가되는 버튼도 처리
    const tableButtonObserver = new MutationObserver(function (mutations) {
        convertTableButtonToIcon();
    });
    tableButtonObserver.observe(document.body, { childList: true, subtree: true });
});

