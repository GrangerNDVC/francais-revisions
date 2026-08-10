// ============================================
// GÉNÉRATEUR DE FICHE PDF - VERSION UNIFIÉE
// ============================================
// Ce fichier corrige le bug d'affichage de la sidebar
// et standardise la génération des PDF sur toutes les pages
// ============================================

(function() {
    // Vérifier que les bibliothèques nécessaires sont chargées
    if (typeof window.jspdf === 'undefined' || typeof html2canvas === 'undefined') {
        console.error('❌ Bibliothèques manquantes : jsPDF ou html2canvas');
        return;
    }

    console.log('✅ Générateur PDF unifié chargé');

    // Sauvegarder l'ancienne fonction si elle existe (au cas où)
    const oldGeneratePDF = window.generatePDF;

    // ============================================
    // NOUVELLE FONCTION GÉNÉRALE
    // ============================================
    window.generatePDF = async function() {
        console.log('📄 Génération PDF avec le générateur unifié...');
        
        try {
            // Récupérer les éléments sélectionnés
            const selectedElements = [];
            document.querySelectorAll('input[name="fiche-element"]:checked, .checkbox-simple input:checked').forEach(checkbox => {
                selectedElements.push(checkbox.value || checkbox.id || 'element');
            });
            
            if (selectedElements.length === 0) {
                alert('Veuillez cocher au moins un élément pour votre fiche de révision.');
                return;
            }

            // Trouver le bouton de génération pour le spinner
            const generateBtn = document.querySelector('.btn-accent, button[onclick*="generatePDF"]');
            const originalText = generateBtn ? generateBtn.innerHTML : 'Générer PDF';
            if (generateBtn) {
                generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération...';
                generateBtn.disabled = true;
            }

            // Mettre à jour la prévisualisation
            if (typeof updateFichePreview === 'function') {
                updateFichePreview();
            } else if (typeof generatePreview === 'function') {
                generatePreview();
            }

            // Attendre un peu que le DOM se mette à jour
            await new Promise(resolve => setTimeout(resolve, 300));

            // Récupérer le contenu de la prévisualisation
            const previewContent = document.getElementById('preview-content') || document.getElementById('fichePreview');
            if (!previewContent) {
                throw new Error("Contenu de prévisualisation introuvable");
            }

            // Récupérer le titre de la page
            let pageTitle = document.querySelector('h1')?.innerText || 'Fiche de révision';
            pageTitle = pageTitle.replace(/[<>:"/\\|?*]/g, '-'); // Nettoyer pour nom de fichier

            // ============================================
            // CRÉATION DU PDF
            // ============================================
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 10;
            const maxWidth = pageWidth - (margin * 2);
            const maxHeight = pageHeight - (margin * 2);

            // ============================================
            // CRÉATION D'UN CONTENEUR ISOLÉ
            // ============================================
            const fullContainer = document.createElement('div');
            
            // Styles de base pour éviter tout héritage
            fullContainer.style.cssText = `
                position: absolute;
                left: -9999px;
                top: 0;
                width: ${maxWidth}mm;
                background: white;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
                padding: 10px;
                box-sizing: border-box;
                font-size: 0.9em;
                color: #212529;
                margin: 0;
                border: none;
                box-shadow: none;
                line-height: 1.6;
            `;

            // Copier le contenu
            fullContainer.innerHTML = previewContent.innerHTML;

            // ============================================
            // STYLES FORCÉS POUR LE PDF
            // ============================================
            const styleOverride = document.createElement('style');
            styleOverride.textContent = `
                * {
                    background: white !important;
                    color: #212529 !important;
                    font-family: inherit;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
                .fiche-preview {
                    background: white !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                .fiche-preview .section {
                    background-color: #f8f9fa !important;
                    border-left: 4px solid #4361ee !important;
                    margin-bottom: 15px !important;
                    padding: 15px !important;
                }
                .fiche-preview h2 {
                    color: #4361ee !important;
                    border-bottom: 2px solid #4361ee !important;
                    margin-bottom: 20px !important;
                    padding-bottom: 10px !important;
                }
                .fiche-preview h3 {
                    color: #4361ee !important;
                    margin-bottom: 10px !important;
                }
                .fiche-preview .conjugation-table {
                    background: linear-gradient(135deg, #f5f7fa 0%, #e3e8f0 100%) !important;
                    border-left: 5px solid #4cc9f0 !important;
                    padding: 10px !important;
                    margin: 10px 0 !important;
                }
                .fiche-preview .verb-row {
                    display: flex !important;
                    justify-content: space-between !important;
                    padding: 5px !important;
                    border-bottom: 1px solid rgba(0,0,0,0.05) !important;
                }
                .fiche-preview .pronoun {
                    font-weight: bold !important;
                    color: #212529 !important;
                }
                .fiche-preview .verb-form {
                    color: #4361ee !important;
                    font-weight: 600 !important;
                }
                table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                }
                td, th {
                    padding: 8px !important;
                    border: 1px solid #e9ecef !important;
                }
                th {
                    background-color: #4361ee !important;
                    color: white !important;
                }
            `;
            fullContainer.appendChild(styleOverride);

            document.body.appendChild(fullContainer);

            // ============================================
            // CAPTURE AVEC HTML2CANVAS
            // ============================================
            const fullCanvas = await html2canvas(fullContainer, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: maxWidth * 3.78,
                windowWidth: maxWidth * 3.78,
                onclone: function(clonedDoc) {
                    // SUPPRIMER TOUTE TRACE DE LA SIDEBAR DANS LE CLONE
                    const sidebars = clonedDoc.querySelectorAll('.sidebar, [class*="sidebar"], aside, [class*="Sidebar"]');
                    sidebars.forEach(el => {
                        if (el) el.remove(); // Supprimer carrément, pas seulement cacher
                    });
                    
                    // Supprimer aussi les boutons et headers
                    const headers = clonedDoc.querySelectorAll('.header-controls, .btn-group, .btn, .lesson-tabs');
                    headers.forEach(el => el.remove());
                }
            });

            // ============================================
            // DÉCOUPAGE EN PAGES
            // ============================================
            const fullImgHeight = fullCanvas.height / (2 * 3.78);
            const calculatedPages = Math.ceil(fullImgHeight / maxHeight);
            const numPages = Math.min(calculatedPages, 2); // Max 2 pages

            for (let pageNum = 0; pageNum < numPages; pageNum++) {
                if (pageNum > 0) {
                    pdf.addPage();
                }

                const pageCanvas = document.createElement('canvas');
                const ctx = pageCanvas.getContext('2d');

                const pageHeightPx = maxHeight * 3.78 * 2;
                const yOffset = pageNum * pageHeightPx;

                pageCanvas.width = fullCanvas.width;
                pageCanvas.height = Math.min(pageHeightPx, fullCanvas.height - yOffset);

                ctx.drawImage(
                    fullCanvas,
                    0, yOffset,
                    fullCanvas.width, pageCanvas.height,
                    0, 0,
                    pageCanvas.width, pageCanvas.height
                );

                const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
                const imgWidth = maxWidth;
                const imgHeight = (pageCanvas.height / pageCanvas.width) * imgWidth;

                pdf.addImage(
                    imgData,
                    'JPEG',
                    margin,
                    margin,
                    imgWidth,
                    imgHeight,
                    '',
                    'FAST'
                );
            }

            // Nettoyer
            document.body.removeChild(fullContainer);

            // ============================================
            // SAUVEGARDE
            // ============================================
            const fileName = `fiche-${pageTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`;
            pdf.save(fileName);

            // Restaurer le bouton
            if (generateBtn) {
                generateBtn.innerHTML = originalText;
                generateBtn.disabled = false;
            }

            alert(`✅ Fiche de révision générée avec succès !`);

        } catch (error) {
            console.error('❌ Erreur génération PDF:', error);
            alert('❌ Une erreur est survenue lors de la génération du PDF. Vérifie la console pour plus de détails.');

            // Restaurer le bouton
            const generateBtn = document.querySelector('.btn-accent, button[onclick*="generatePDF"]');
            if (generateBtn) {
                generateBtn.innerHTML = generateBtn.innerHTML.replace('<i class="fas fa-spinner fa-spin"></i>', '');
                generateBtn.disabled = false;
            }
        }
    };

    // ============================================
    // SURCHARGER AUSSI exportPDF SI ELLE EXISTE
    // ============================================
    if (typeof window.exportPDF === 'function') {
        window.exportPDF = window.generatePDF;
    }

    console.log('✅ Fonction generatePDF remplacée par la version unifiée');
})();