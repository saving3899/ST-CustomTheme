/**
 * ST-CustomTheme: Persona PNG Export/Import Module
 *
 * This module provides functionality to export personas to PNG files with embedded metadata
 * and import personas from such PNG files.
 */

(function () {
    'use strict';

    const PERSONA_IDENTIFIER = 'stpersona';
    const USER_AVATAR_PATH = 'User Avatars/';

    // Will be set by init function
    let stCustomThemeSettings = null;

    /**
     * CRC32 lookup table for PNG chunk CRC calculation
     */
    const CRC_TABLE = (() => {
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[i] = c;
        }
        return table;
    })();

    /**
     * Calculate CRC32 for a byte array
     * @param {Uint8Array} data
     * @returns {number}
     */
    function crc32(data) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) {
            crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    /**
     * Convert a number to a 4-byte big-endian array
     * @param {number} num
     * @returns {Uint8Array}
     */
    function uint32ToBytes(num) {
        return new Uint8Array([
            (num >>> 24) & 0xFF,
            (num >>> 16) & 0xFF,
            (num >>> 8) & 0xFF,
            num & 0xFF
        ]);
    }

    /**
     * Create a PNG tEXt chunk
     * @param {string} keyword The keyword (identifier)
     * @param {string} text The text content (base64 encoded JSON)
     * @returns {Uint8Array}
     */
    function createTextChunk(keyword, text) {
        const keywordBytes = new TextEncoder().encode(keyword);
        const textBytes = new TextEncoder().encode(text);

        // Chunk data: keyword + null separator + text
        const chunkData = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
        chunkData.set(keywordBytes, 0);
        chunkData[keywordBytes.length] = 0; // null separator
        chunkData.set(textBytes, keywordBytes.length + 1);

        // Chunk type
        const chunkType = new TextEncoder().encode('tEXt');

        // For CRC: type + data
        const crcData = new Uint8Array(4 + chunkData.length);
        crcData.set(chunkType, 0);
        crcData.set(chunkData, 4);

        const crc = crc32(crcData);

        // Full chunk: length (4) + type (4) + data + crc (4)
        const chunk = new Uint8Array(4 + 4 + chunkData.length + 4);
        chunk.set(uint32ToBytes(chunkData.length), 0);
        chunk.set(chunkType, 4);
        chunk.set(chunkData, 8);
        chunk.set(uint32ToBytes(crc), 8 + chunkData.length);

        return chunk;
    }

    /**
     * Insert a tEXt chunk into PNG data (before IEND)
     * @param {Uint8Array} pngData Original PNG data
     * @param {string} identifier Chunk identifier
     * @param {object} jsonData Data to embed
     * @returns {Uint8Array} New PNG data with embedded chunk
     */
    function insertTextChunkIntoPng(pngData, identifier, jsonData) {

        // Check PNG header first
        if (pngData[0] !== 0x89 || pngData[1] !== 0x50 ||
            pngData[2] !== 0x4E || pngData[3] !== 0x47) {
            console.error('Not a valid PNG file');
            return pngData;
        }

        // Find IEND chunk by parsing chunks properly
        let iendPos = -1;
        let idx = 8; // Skip PNG signature

        while (idx < pngData.length) {
            // Read chunk length (big-endian)
            const length = (pngData[idx] << 24) | (pngData[idx + 1] << 16) |
                (pngData[idx + 2] << 8) | pngData[idx + 3];

            // Read chunk type
            const type = String.fromCharCode(
                pngData[idx + 4], pngData[idx + 5],
                pngData[idx + 6], pngData[idx + 7]
            );

            if (type === 'IEND') {
                iendPos = idx;
                break;
            }

            // Move to next chunk: length (4) + type (4) + data (length) + CRC (4)
            idx += 4 + 4 + length + 4;
        }

        if (iendPos === -1) {
            console.error('IEND chunk not found in PNG');
            return pngData;
        }

        // Create tEXt chunk with base64 encoded JSON
        const base64Data = btoa(unescape(encodeURIComponent(JSON.stringify(jsonData))));
        const textChunk = createTextChunk(identifier, base64Data);

        // Combine: before IEND + new chunk + IEND
        const beforeIend = pngData.slice(0, iendPos);
        const iendChunk = pngData.slice(iendPos);

        const newPng = new Uint8Array(beforeIend.length + textChunk.length + iendChunk.length);
        newPng.set(beforeIend, 0);
        newPng.set(textChunk, beforeIend.length);
        newPng.set(iendChunk, beforeIend.length + textChunk.length);
        return newPng;
    }

    /**
     * Extract JSON data from PNG tEXt chunk
     * @param {Uint8Array} pngData PNG file data
     * @param {string} identifier Identifier to look for
     * @returns {object|null} Extracted JSON or null
     */
    function extractDataFromPng(pngData, identifier) {
        // Check PNG header
        if (!pngData || pngData[0] !== 0x89 || pngData[1] !== 0x50 ||
            pngData[2] !== 0x4E || pngData[3] !== 0x47) {
            return null;
        }

        let idx = 8;

        while (idx < pngData.length) {
            // Read chunk length (big-endian)
            const length = (pngData[idx] << 24) | (pngData[idx + 1] << 16) |
                (pngData[idx + 2] << 8) | pngData[idx + 3];
            idx += 4;

            // Read chunk type
            const type = String.fromCharCode(pngData[idx], pngData[idx + 1],
                pngData[idx + 2], pngData[idx + 3]);
            idx += 4;

            if (type === 'IEND') break;

            if (type === 'tEXt') {
                const chunkData = pngData.slice(idx, idx + length);

                // Find null separator
                let nullPos = 0;
                while (nullPos < chunkData.length && chunkData[nullPos] !== 0) {
                    nullPos++;
                }

                const keyword = new TextDecoder().decode(chunkData.slice(0, nullPos));

                if (keyword === identifier) {
                    const textData = new TextDecoder().decode(chunkData.slice(nullPos + 1));
                    try {
                        return JSON.parse(decodeURIComponent(escape(atob(textData))));
                    } catch (e) {
                        console.error('Failed to parse persona data:', e);
                        return null;
                    }
                }
            }

            idx += length + 4; // Skip data and CRC
        }

        return null;
    }

    /**
     * Convert data URL to Uint8Array
     * @param {string} dataUrl
     * @returns {Uint8Array}
     */
    function dataUrlToUint8Array(dataUrl) {
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Convert Uint8Array to data URL
     * @param {Uint8Array} bytes
     * @param {string} mimeType
     * @returns {string}
     */
    function uint8ArrayToDataUrl(bytes, mimeType = 'image/png') {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return `data:${mimeType};base64,${btoa(binary)}`;
    }

    /**
     * Get the currently selected persona's avatar ID
     * @returns {string|null}
     */
    function getCurrentPersonaAvatarId() {
        // Try to get from selected avatar in UI first (most reliable)
        try {
            // Look for selected avatar container in persona panel
            const selectedAvatar = document.querySelector('.avatar-container.selected[data-avatar-id]');
            if (selectedAvatar) {
                return selectedAvatar.getAttribute('data-avatar-id');
            }

            // Fallback: check #user_avatar_block
            const userAvatarBlock = document.querySelector('#user_avatar_block .avatar-container.selected[data-avatar-id]');
            if (userAvatarBlock) {
                return userAvatarBlock.getAttribute('data-avatar-id');
            }

            return null;
        } catch (e) {
            console.error('Failed to get current persona:', e);
            return null;
        }
    }

    /**
     * Get persona data from selected DOM element
     * @returns {object|null} Persona data or null
     */
    function getPersonaDataFromDOM() {
        const selectedContainer = document.querySelector('.avatar-container.selected[data-avatar-id]');
        if (!selectedContainer) {
            return null;
        }

        const avatarId = selectedContainer.getAttribute('data-avatar-id');
        const name = selectedContainer.querySelector('.ch_name')?.textContent?.trim() || '';
        const additionalInfo = selectedContainer.querySelector('.ch_additional_info')?.textContent?.trim() || '';
        const description = selectedContainer.querySelector('.ch_description')?.textContent?.trim() || '';

        // Get avatar image URL
        const avatarImg = selectedContainer.querySelector('.avatar img');
        const avatarSrc = avatarImg?.getAttribute('src') || '';

        return {
            avatarId,
            name,
            additionalInfo,
            description,
            avatarSrc
        };
    }

    /**
     * Export the currently selected persona to a PNG file
     */
    async function exportPersona() {
        try {
            // Get persona data from DOM
            const domData = getPersonaDataFromDOM();

            if (!domData || !domData.avatarId) {
                toastr.warning('내보낼 페르소나를 선택해주세요.');
                return;
            }

            if (!domData.name) {
                toastr.error('페르소나 이름을 찾을 수 없습니다.');
                return;
            }

            // Fetch avatar image from the actual URL
            let avatarUrl = domData.avatarSrc;
            // If it's a thumbnail URL, try to get the full image
            if (avatarUrl.includes('/thumbnail')) {
                avatarUrl = `${USER_AVATAR_PATH}${domData.avatarId}`;
            }

            const response = await fetch(avatarUrl);

            if (!response.ok) {
                toastr.error('아바타 이미지를 가져올 수 없습니다.');
                return;
            }

            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const pngData = new Uint8Array(arrayBuffer);

            // Prepare persona data
            const personaData = {
                name: domData.name,
                additionalInfo: domData.additionalInfo,
                description: domData.description,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            // Insert metadata into PNG
            const newPngData = insertTextChunkIntoPng(pngData, PERSONA_IDENTIFIER, personaData);

            // Download
            const downloadBlob = new Blob([newPngData], { type: 'image/png' });
            const downloadUrl = URL.createObjectURL(downloadBlob);

            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${domData.name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);

            toastr.success(`"${domData.name}" 페르소나를 내보냈습니다.`);

        } catch (e) {
            console.error('Failed to export persona:', e);
            toastr.error('페르소나 내보내기에 실패했습니다.');
        }
    }

    /**
     * Import a persona from a PNG file
     * @param {File} file PNG file to import
     */
    async function importPersona(file) {
        try {
            if (!file || !file.type.includes('png')) {
                toastr.error('PNG 파일만 불러올 수 있습니다.');
                return;
            }

            const arrayBuffer = await file.arrayBuffer();
            const pngData = new Uint8Array(arrayBuffer);

            // Extract persona data
            const personaData = extractDataFromPng(pngData, PERSONA_IDENTIFIER);

            if (!personaData) {
                toastr.error('페르소나 데이터가 포함되지 않은 PNG 파일입니다.');
                return;
            }

            if (!personaData.name) {
                toastr.error('유효하지 않은 페르소나 데이터입니다.');
                return;
            }

            // Generate unique avatar ID (timestamp + sanitized name)
            const sanitizedName = personaData.name.replace(/[^a-zA-Z0-9]/g, '');
            const avatarId = `${Date.now()}-${sanitizedName}.png`;

            // Get SillyTavern context for API calls
            const context = SillyTavern.getContext();

            // Upload avatar image
            const formData = new FormData();
            const pngBlob = new Blob([pngData], { type: 'image/png' });
            const pngFile = new File([pngBlob], avatarId, { type: 'image/png' });
            formData.append('avatar', pngFile);
            formData.append('overwrite_name', avatarId);

            const uploadResponse = await fetch('/api/avatars/upload', {
                method: 'POST',
                headers: context?.getRequestHeaders ?
                    context.getRequestHeaders({ omitContentType: true }) : {},
                cache: 'no-cache',
                body: formData,
            });

            if (!uploadResponse.ok) {
                toastr.error('아바타 업로드에 실패했습니다.');
                return;
            }

            const uploadData = await uploadResponse.json();
            const finalAvatarId = uploadData?.path || avatarId;

            // Try to use SillyTavern's initPersona function via dynamic import
            try {
                const personasModule = await import('/scripts/personas.js');
                if (personasModule.initPersona) {
                    personasModule.initPersona(
                        finalAvatarId,
                        personaData.name,
                        personaData.description || '',
                        personaData.additionalInfo || ''
                    );

                } else {
                    throw new Error('initPersona not found in module');
                }
            } catch (importError) {
                console.warn('Dynamic import failed, trying direct power_user access:', importError);

                // Fallback to direct power_user access
                const power_user = window.power_user;
                if (power_user && power_user.personas && power_user.persona_descriptions) {
                    power_user.personas[finalAvatarId] = personaData.name;
                    power_user.persona_descriptions[finalAvatarId] = {
                        description: personaData.description || '',
                        position: personaData.position ?? 0,
                        depth: personaData.depth ?? 2,
                        role: personaData.role ?? 0,
                        lorebook: '',
                        title: personaData.additionalInfo || '',
                    };

                    // Save settings
                    if (context?.saveSettingsDebounced) {
                        context.saveSettingsDebounced();
                    }
                } else {
                    console.warn('power_user not accessible, persona uploaded as avatar only');
                    toastr.info('아바타가 업로드되었습니다. 페르소나로 등록하려면 직접 설정해주세요.');
                }
            }

            // Refresh persona list and select the new persona using the same module
            try {
                const personasModule = await import('/scripts/personas.js');

                // Refresh avatar list
                if (personasModule.getUserAvatars) {
                    await personasModule.getUserAvatars(true, finalAvatarId);
                }

                // Select the new persona
                if (personasModule.setUserAvatar) {
                    await personasModule.setUserAvatar(finalAvatarId);
                }
            } catch (refreshError) {
                console.warn('Failed to refresh via module, trying fallback:', refreshError);
            }

            // Fallback: click on the avatar element after a short delay
            setTimeout(() => {
                const avatarEl = document.querySelector(`.avatar-container[data-avatar-id="${finalAvatarId}"]`);
                if (avatarEl && !avatarEl.classList.contains('selected')) {
                    avatarEl.click();
                }
            }, 300);

            toastr.success(`"${personaData.name}" 페르소나를 불러왔습니다.`);

        } catch (e) {
            console.error('Failed to import persona:', e);
            toastr.error('페르소나 불러오기에 실패했습니다.');
        }
    }

    /**
     * Create export/import buttons HTML
     */
    function createButtons() {
        const container = document.createElement('div');
        container.id = 'st-persona-export-buttons';
        container.className = 'st-persona-export-buttons';
        container.innerHTML = `
            <div id="st-persona-export-btn" class="menu_button fa-solid fa-file-export" title="페르소나 내보내기 (PNG)"></div>
            <div id="st-persona-import-btn" class="menu_button fa-solid fa-file-import" title="페르소나 불러오기 (PNG)"></div>
            <input type="file" id="st-persona-import-input" accept="image/png" style="display: none;">
        `;
        return container;
    }

    /**
     * Inject export/import buttons into persona panel
     */
    function injectPersonaExportButtons() {
        // Remove existing if any
        removePersonaExportButtons();

        // Find the persona controls buttons block
        const targetBlock = document.querySelector('.persona_controls_buttons_block');

        if (!targetBlock) {
            console.warn('ST-PersonaExport: Persona controls block not found');
            return;
        }

        const buttons = createButtons();
        targetBlock.appendChild(buttons);

        // Bind events
        document.getElementById('st-persona-export-btn')?.addEventListener('click', exportPersona);

        document.getElementById('st-persona-import-btn')?.addEventListener('click', () => {
            document.getElementById('st-persona-import-input')?.click();
        });

        document.getElementById('st-persona-import-input')?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (file) {
                await importPersona(file);
                e.target.value = ''; // Allow selecting same file again
            }
        });


    }

    /**
     * Remove export/import buttons from persona panel
     */
    function removePersonaExportButtons() {
        const existing = document.getElementById('st-persona-export-buttons');
        if (existing) {
            existing.remove();
        }
    }

    /**
     * Check and update button visibility based on settings
     */
    function updateButtonVisibility() {
        if (stCustomThemeSettings?.personaExportEnabled) {
            // Only inject if persona panel is open
            const personaPanel = document.querySelector('#persona-management-button .drawer-content.openDrawer');
            if (personaPanel) {
                injectPersonaExportButtons();
            }
        } else {
            removePersonaExportButtons();
        }
    }

    /**
     * Initialize the module
     * @param {object} settings Reference to stCustomThemeSettings
     */
    function init(settings) {
        stCustomThemeSettings = settings;

        // Listen for persona panel open/close to inject/remove buttons
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateButtonVisibility();
                }
            });
        });

        // Observe persona panel drawer content
        const personaDrawer = document.querySelector('#persona-management-button .drawer-content');
        if (personaDrawer) {
            observer.observe(personaDrawer, { attributes: true });
        }

        // Initial check
        updateButtonVisibility();


    }

    // Expose functions globally for index.js to use
    window.STPersonaExport = {
        init,
        injectPersonaExportButtons,
        removePersonaExportButtons,
        updateButtonVisibility,
        exportPersona,
        importPersona
    };

})();
