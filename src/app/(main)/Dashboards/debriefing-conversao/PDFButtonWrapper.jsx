// Filename: app/main/Dashboards/debriefing-conversao/PDFButtonWrapper.jsx
'use client'; // Necessário para useEffect e PDFDownloadLink

import React, { useState, useEffect } from 'react'; // Adicionado useState e useEffect
import { Download, Loader2, FileDown } from 'lucide-react';

// =================================================================
// /// --- IMPORTAÇÕES DO PDF E LÓGICA MOVIDA PARA CÁ --- ///
// =================================================================

// --- Define placeholders para componentes PDF ---
// Inicializamos como nulos. Eles serão carregados no cliente.
let PDFDownloadLink = null;
let Document = null;
let Page = null;
let Text = null;
let View = null;
let StyleSheet = null;
let Image = null;
let Font = null;

// --- Define placeholders para os componentes do Documento PDF ---
// Eles só serão definidos DEPOIS que a biblioteca for carregada no cliente.
let DebriefingPDFDocument = () => null;
let PdfAnalysisTable = () => null;
let PdfTopTwoTable = () => null; // NOVO PARA A TABELA RESUMO
let pdfStyles = {};


// =================================================================
// /// --- COMPONENTE DO BOTÃO (LÓGICA PRINCIPAL) --- ///
// =================================================================

const PDFButtonWrapper = ({
    isLoadingDebrief,
    isCapturingImages,
    chartImages,
    selectedLaunch,
    captureChartImages,
    ...data // Recebe o restante dos dados (resumo, fontes, perfilPublicoData, etc.)
}) => {

    const [isClient, setIsClient] = useState(false);

    // useEffect só roda no cliente.
    useEffect(() => {
        
        // --- CORREÇÃO: Usa a função import() assíncrona ---
        const loadPdfLibrary = async () => {
            try {
                // Importa a biblioteca @react-pdf/renderer dinamicamente no cliente
                const pdf = await import('@react-pdf/renderer');
                
                // Atribui os componentes reais às nossas variáveis
                PDFDownloadLink = pdf.PDFDownloadLink;
                Document = pdf.Document;
                Page = pdf.Page;
                Text = pdf.Text;
                View = pdf.View;
                StyleSheet = pdf.StyleSheet;
                Image = pdf.Image;
                Font = pdf.Font;

                // --- Agora que temos os componentes, definimos os estilos e o Documento ---
                
                pdfStyles = StyleSheet.create({
                    page: { flexDirection: 'column', backgroundColor: '#FFFFFF', padding: 30, fontFamily: 'Helvetica' },
                    pageNumber: { position: 'absolute', fontSize: 10, bottom: 30, left: 0, right: 0, textAlign: 'center', color: 'grey' },
                    header: { fontSize: 24, marginBottom: 20, textAlign: 'center', color: '#1F2937', fontWeight: 'bold' },
                    section: { marginBottom: 20 },
                    sectionTitle: { fontSize: 18, marginBottom: 10, color: '#374151', fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 5 },
                    kpiContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', marginBottom: 10 },
                    kpiBox: { width: '30%', minWidth: 100, padding: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, alignItems: 'center', marginBottom: 10 },
                    kpiValue: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
                    kpiLabel: { fontSize: 9, color: '#4B5563', textAlign: 'center' },
                    chartImage: { width: '100%', height: 'auto', maxWidth: 500, maxHeight: 300, alignSelf: 'center', marginBottom: 10 },
                    table: { width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 4 },
                    tableHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' },
                    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
                    tableColHeader: { padding: 5, fontSize: 9, fontWeight: 'bold', color: '#374151', borderRightWidth: 1, borderRightColor: '#E5E7EB' },
                    tableCol: { padding: 5, fontSize: 8, borderRightWidth: 1, borderRightColor: '#E5E7EB' },
                    // Estilos para Tabelas Resumo (Top 2)
                    tableTopTwoColHeader: { padding: 5, fontSize: 9, fontWeight: 'bold', color: '#374151' },
                    tableTopTwoCol: { padding: 5, fontSize: 9 },
                    tableTopTwoRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
                    tableTopTwoRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#F9FAFB' }, // Zebrado
                    // Estilos de Perfil
                    profileSection: { marginBottom: 15, pageBreakInside: 'avoid' }, // Evita quebrar a seção no meio
                    profileQuestion: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, color: '#1F2937' },
                    profileContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
                    profileList: { width: '55%' },
                    profileChart: { width: '40%', height: 'auto', maxHeight: 150, alignSelf: 'center' },
                    profileAnswerRow: { flexDirection: 'row', justifyContent: 'space-between', fontSize: 9, marginBottom: 3, borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6', paddingBottom: 2},
                    profileAnswerLabel: { maxWidth: '70%' },
                    // Estilos de Insights
                    insightList: { paddingLeft: 10 },
                    insightItem: { fontSize: 10, marginBottom: 5, flexDirection: 'row' },
                    insightText: { flex: 1, marginLeft: 5 },
                    textAreaPDF: { fontSize: 10, fontFamily: 'Helvetica', color: '#333', padding: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 4, marginTop: 5 }
                });

                // Tabela de Análise Padrão (Score, MQL)
                PdfAnalysisTable = ({ data = [], col1Name }) => (
                    <View style={pdfStyles.table}>
                        <View style={pdfStyles.tableHeader}>
                            <Text style={[pdfStyles.tableColHeader, { width: '40%' }]}>{col1Name}</Text>
                            <Text style={[pdfStyles.tableColHeader, { width: '15%', textAlign: 'right' }]}>Check-ins</Text>
                            <Text style={[pdfStyles.tableColHeader, { width: '15%', textAlign: 'right' }]}>% Ck Total</Text>
                            <Text style={[pdfStyles.tableColHeader, { width: '15%', textAlign: 'right' }]}>Compras</Text>
                            <Text style={[pdfStyles.tableColHeader, { width: '15%', textAlign: 'right', borderRightWidth: 0 }]}>% Compra Total</Text>
                        </View>
                        {data.map((row, index) => (
                            <View key={index} style={pdfStyles.tableRow} wrap={false}>
                                <Text style={[pdfStyles.tableCol, { width: '40%' }]}>{row[col1Name]}</Text>
                                <Text style={[pdfStyles.tableCol, { width: '15%', textAlign: 'right' }]}>{(row.checkins || 0).toLocaleString('pt-BR')}</Text>
                                <Text style={[pdfStyles.tableCol, { width: '15%', textAlign: 'right' }]}>{parseFloat(row.tx_checkin_contribution || 0).toFixed(2)}%</Text>
                                <Text style={[pdfStyles.tableCol, { width: '15%', textAlign: 'right' }]}>{(row.vendas || 0).toLocaleString('pt-BR')}</Text>
                                <Text style={[pdfStyles.tableCol, { width: '15%', textAlign: 'right', borderRightWidth: 0, fontWeight: 'bold' }]}>{parseFloat(row.tx_venda_contribution || 0).toFixed(2)}%</Text>
                            </View>
                        ))}
                    </View>
                );

                // *** NOVA TABELA PARA O TOP 2 ***
                PdfTopTwoTable = ({ data = [], questions = {} }) => {
                    if (!data || data.length === 0) return <Text style={{fontSize: 10, color: 'grey'}}>Nenhum dado para o resumo.</Text>;
                    
                    const groupedTopTwo = data.reduce((acc, curr) => {
                        acc[curr.question_text] = acc[curr.question_text] || [];
                        acc[curr.question_text].push({ answer: curr.answer_text, percentage: curr.answer_percentage });
                        return acc;
                    }, {});

                    const orderedQuestions = [ 
                        ...(questions.publico || []), 
                        ...(questions.inscritos || []), 
                        ...(questions.compradores || []) 
                    ].filter(q => groupedTopTwo[q]); // Filtra apenas as que temos dados

                    return (
                        <View style={pdfStyles.table}>
                            <View style={pdfStyles.tableHeader}>
                                <Text style={[pdfStyles.tableTopTwoColHeader, { width: '50%' }]}>Pergunta</Text>
                                <Text style={[pdfStyles.tableTopTwoColHeader, { width: '25%' }]}>1ª Resposta Mais Comum</Text>
                                <Text style={[pdfStyles.tableTopTwoColHeader, { width: '25%' }]}>2ª Resposta Mais Comum</Text>
                            </View>
                            {orderedQuestions.map((questionText, index) => {
                                const answers = groupedTopTwo[questionText] || [];
                                const top1 = answers[0] ? `${answers[0].answer} (${answers[0].percentage}%)` : '-';
                                const top2 = answers[1] ? `${answers[1].answer} (${answers[1].percentage}%)` : '-';
                                // Aplica estilo zebrado
                                const rowStyle = index % 2 === 0 ? pdfStyles.tableTopTwoRow : pdfStyles.tableTopTwoRowAlt;
                                
                                return (
                                    <View key={questionText} style={rowStyle} wrap={false}>
                                        <Text style={[pdfStyles.tableTopTwoCol, { width: '50%', fontWeight: 'bold' }]}>{questionText}</Text>
                                        <Text style={[pdfStyles.tableTopTwoCol, { width: '25%' }]}>{top1}</Text>
                                        <Text style={[pdfStyles.tableTopTwoCol, { width: '25%' }]}>{top2}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    );
                };

                // *** DOCUMENTO PDF ATUALIZADO ***
                DebriefingPDFDocument = ({ data = {}, images = {} }) => {
                    // Mapeia os novos nomes de props para os nomes antigos usados no PDF
                    const groupedPublico = data.perfilPublicoData || {};
                    const groupedInscritos = data.perfilInscritosData || {};
                    const groupedCompradores = data.perfilCompradoresData || {};
                    
                    const resumo = data.resumo || {};
                    const fontes = data.fontes || [];
                    const tabelaMestra = data.tabelaMestra || [];
                    const automatedInsights = data.automatedInsights || { escalar: [], ajustar: []};
                    const topTwoAnswersData = data.topTwoAnswersData || [];
                    const profileQuestionLists = data.profileQuestionLists || {};

                    // Regex para remover caracteres não-ASCII (como emojis)
                    const stripEmojis = (str) => str ? str.replace(/[^\x00-\x7F]/g, "").trim() : "";
                    
                    // Helper para renderizar seções de perfil
                    const renderProfilePage = (title, profileData, chartImages) => (
                        <Page size="A4" style={pdfStyles.page} wrap>
                            <Text style={pdfStyles.sectionTitle}>{title}</Text>
                            {Object.keys(profileData).length > 0 ? Object.keys(profileData).map((pergunta) => (
                                <View key={pergunta} style={pdfStyles.profileSection} wrap={false}>
                                    <Text style={pdfStyles.profileQuestion}>{pergunta}</Text>
                                    <View style={pdfStyles.profileContent}>
                                        <View style={pdfStyles.profileList}>
                                            {(profileData[pergunta] || []).sort((a,b) => b.count - a.count).map((r, i) => (
                                                <View key={i} style={pdfStyles.profileAnswerRow}>
                                                    <Text style={pdfStyles.profileAnswerLabel}>{r.answer}</Text>
                                                    <Text>{r.percentage}%</Text>
                                                </View>
                                            ))}
                                        </View>
                                        {chartImages?.[pergunta] && (
                                            <Image style={pdfStyles.profileChart} src={chartImages[pergunta]} />
                                        )}
                                    </View>
                                </View>
                            )) : <Text style={{fontSize: 10, color: 'grey'}}>Nenhum dado de perfil encontrado.</Text>}
                            <Text style={pdfStyles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
                        </Page>
                    );


                    return (
                        <Document>
                            {/* Página 1: Resumo Executivo e Movimentação */}
                            <Page size="A4" style={pdfStyles.page} wrap>
                                <Text style={pdfStyles.header}>Debriefing de Conversão</Text>
                                <Text style={{ fontSize: 12, textAlign: 'center', marginBottom: 20, color: 'grey' }}>Relatório gerado em: {new Date().toLocaleDateString('pt-BR')}</Text>
                                <View style={pdfStyles.section}><Text style={pdfStyles.sectionTitle}>Resumo Executivo</Text><View style={pdfStyles.kpiContainer}><View style={pdfStyles.kpiBox}><Text style={pdfStyles.kpiValue}>{(resumo.total_leads || 0).toLocaleString('pt-BR')}</Text><Text style={pdfStyles.kpiLabel}>Total Leads</Text></View><View style={pdfStyles.kpiBox}><Text style={pdfStyles.kpiValue}>{(resumo.total_checkins || 0).toLocaleString('pt-BR')}</Text><Text style={pdfStyles.kpiLabel}>Total Check-ins</Text></View><View style={pdfStyles.kpiBox}><Text style={pdfStyles.kpiValue}>{(resumo.total_vendas || 0).toLocaleString('pt-BR')}</Text><Text style={pdfStyles.kpiLabel}>Total Compras</Text></View><View style={pdfStyles.kpiBox}><Text style={pdfStyles.kpiValue}>{parseFloat(resumo.tx_lead_checkin || 0).toFixed(2)}%</Text><Text style={pdfStyles.kpiLabel}>Tx. L p/ C</Text></View><View style={pdfStyles.kpiBox}><Text style={pdfStyles.kpiValue}>{parseFloat(resumo.tx_checkin_venda || 0).toFixed(2)}%</Text><Text style={pdfStyles.kpiLabel}>Tx. C p/ Cp</Text></View><View style={pdfStyles.kpiBox}><Text style={pdfStyles.kpiValue}>{parseFloat(resumo.tx_lead_venda || 0).toFixed(2)}%</Text><Text style={pdfStyles.kpiLabel}>Tx. L p/ Cp</Text></View></View></View>
                                <View style={pdfStyles.section}><Text style={pdfStyles.sectionTitle}>Movimentação Diária</Text>{images.movimentacao && <Image style={pdfStyles.chartImage} src={images.movimentacao} />}</View>
                                <Text style={pdfStyles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
                            </Page>

                            {/* Página 2: Fontes de Tráfego */}
                            <Page size="A4" style={pdfStyles.page} wrap>
                                <View style={pdfStyles.section}><Text style={pdfStyles.sectionTitle}>Análise de Fontes de Tráfego</Text>{images.fontes && <Image style={pdfStyles.chartImage} src={images.fontes} />}<View style={pdfStyles.table}><View style={pdfStyles.tableHeader}><Text style={[pdfStyles.tableColHeader, { width: '35%' }]}>Fonte</Text><Text style={[pdfStyles.tableColHeader, { width: '15%', textAlign: 'right' }]}>Leads</Text><Text style={[pdfStyles.tableColHeader, { width: '15%', textAlign: 'right' }]}>Check-ins</Text><Text style={[pdfStyles.tableColHeader, { width: '15%', textAlign: 'right' }]}>Compras</Text><Text style={[pdfStyles.tableColHeader, { width: '20%', textAlign: 'right', borderRightWidth: 0 }]}>Tx. L/Cp</Text></View>{fontes.map((row, index) => (<View key={index} style={pdfStyles.tableRow} wrap={false}><Text style={[pdfStyles.tableCol, { width: '35%' }]}>{row.fonte}</Text><Text style={[pdfStyles.tableCol, { width: '15%', textAlign: 'right' }]}>{(row.leads_gerados || 0).toLocaleString('pt-BR')}</Text><Text style={[pdfStyles.tableCol, { width: '15%', textAlign: 'right' }]}>{(row.total_checkins || 0).toLocaleString('pt-BR')}</Text><Text style={[pdfStyles.tableCol, { width: '15%', textAlign: 'right' }]}>{(row.vendas || 0).toLocaleString('pt-BR')}</Text><Text style={[pdfStyles.tableCol, { width: '20%', textAlign: 'right', borderRightWidth: 0, fontWeight: 'bold' }]}>{parseFloat(row.tx_lead_venda || 0).toFixed(2)}%</Text></View>))}</View></View>
                                <Text style={pdfStyles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
                            </Page>

                            {/* Página 3: Tabela Mestra */}
                            <Page size="A4" style={pdfStyles.page} wrap>
                                <View style={pdfStyles.section}><Text style={pdfStyles.sectionTitle}>Tabela Mestra de Campanhas</Text><View style={pdfStyles.table}><View style={pdfStyles.tableHeader}><Text style={[pdfStyles.tableColHeader, { width: '25%' }]}>Campanha</Text><Text style={[pdfStyles.tableColHeader, { width: '20%' }]}>Conteúdo</Text><Text style={[pdfStyles.tableColHeader, { width: '10%', textAlign: 'right' }]}>Leads</Text><Text style={[pdfStyles.tableColHeader, { width: '10%', textAlign: 'right' }]}>Ck</Text><Text style={[pdfStyles.tableColHeader, { width: '12%', textAlign: 'right' }]}>Ck/Total Ck</Text><Text style={[pdfStyles.tableColHeader, { width: '10%', textAlign: 'right' }]}>Compras</Text><Text style={[pdfStyles.tableColHeader, { width: '13%', textAlign: 'right', borderRightWidth: 0 }]}>Tx. L/Cp</Text></View>{tabelaMestra.map((row, index) => (<View key={index} style={pdfStyles.tableRow} wrap={false}><Text style={[pdfStyles.tableCol, { width: '25%' }]}>{row.utm_campaign || '(nd)'}</Text><Text style={[pdfStyles.tableCol, { width: '20%' }]}>{row.utm_content || '(nd)'}</Text><Text style={[pdfStyles.tableCol, { width: '10%', textAlign: 'right' }]}>{(row.leads || 0).toLocaleString('pt-BR')}</Text><Text style={[pdfStyles.tableCol, { width: '10%', textAlign: 'right' }]}>{(row.checkins || 0).toLocaleString('pt-BR')}</Text><Text style={[pdfStyles.tableCol, { width: '12%', textAlign: 'right' }]}>{parseFloat(row.tx_lead_checkin_contribution || 0).toFixed(2)}%</Text><Text style={[pdfStyles.tableCol, { width: '10%', textAlign: 'right' }]}>{(row.vendas || 0).toLocaleString('pt-BR')}</Text><Text style={[pdfStyles.tableCol, { width: '13%', textAlign: 'right', borderRightWidth: 0, fontWeight: 'bold' }]}>{parseFloat(row.tx_lead_venda || 0).toFixed(2)}%</Text></View>))}</View></View>
                                <Text style={pdfStyles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
                            </Page>

                            {/* Página 4: Análise de Score e MQL */}
                            <Page size="A4" style={pdfStyles.page} wrap>
                                <View style={pdfStyles.section}><Text style={pdfStyles.sectionTitle}>Análise por Faixa de Score (Check-ins)</Text>{images.scoreAnalysis && <Image style={pdfStyles.chartImage} src={images.scoreAnalysis} />}{<PdfAnalysisTable data={data.scoreAnalysis || []} col1Name="score_range_name" />}</View>
                                <View style={[pdfStyles.section, { marginTop: 20 }]}><Text style={pdfStyles.sectionTitle}>Análise por Nível MQL (Check-ins)</Text>{images.mqlAnalysis && <Image style={pdfStyles.chartImage} src={images.mqlAnalysis} />}{<PdfAnalysisTable data={data.mqlAnalysis || []} col1Name="mql_level" />}</View>
                                <Text style={pdfStyles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
                            </Page>

                            {/* *** NOVAS PÁGINAS DE PERFIL *** */}
                            {renderProfilePage("Análise do Perfil Público", groupedPublico, images.perfilPublico)}
                            {renderProfilePage("Análise do Perfil de Inscritos", groupedInscritos, images.perfilInscritos)}
                            {renderProfilePage("Análise do Perfil de Compradores", groupedCompradores, images.perfilCompradores)}

                            {/* *** NOVA PÁGINA: TOP 2 RESPOSTAS *** */}
                             <Page size="A4" style={pdfStyles.page} wrap>
                                <View style={pdfStyles.section}>
                                    <Text style={pdfStyles.sectionTitle}>Resumo: Top 2 Respostas por Pergunta</Text>
                                    <PdfTopTwoTable data={topTwoAnswersData} questions={profileQuestionLists} />
                                </View>
                                <Text style={pdfStyles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
                            </Page>

                            {/* Página Final: Insights */}
                            <Page size="A4" style={pdfStyles.page} wrap>
                                <View style={pdfStyles.section}><Text style={pdfStyles.sectionTitle}>Insights Automatizados</Text>
                                    <Text style={[pdfStyles.profileQuestion, { color: '#059669' }]}>Pontos a Escalar:</Text>
                                    <View style={pdfStyles.insightList}>
                                        {automatedInsights.escalar?.length > 0 ? automatedInsights.escalar.map((insight, i) => (
                                            <View key={i} style={pdfStyles.insightItem}>
                                                <Text style={{ color: '#059669', marginRight: 5 }}>•</Text>
                                                <Text style={pdfStyles.insightText}>{stripEmojis(insight)}</Text>
                                            </View>
                                        )) : <Text style={{fontSize: 10, color: 'grey'}}>Nenhuma sugestão.</Text>}
                                    </View>
                                    <Text style={[pdfStyles.profileQuestion, { color: '#DC2626', marginTop: 15 }]}>Pontos de Ajuste:</Text>
                                    <View style={pdfStyles.insightList}>
                                        {automatedInsights.ajustar?.length > 0 ? automatedInsights.ajustar.map((insight, i) => (
                                            <View key={i} style={pdfStyles.insightItem}>
                                                <Text style={{ color: '#DC2626', marginRight: 5 }}>•</Text>
                                                <Text style={pdfStyles.insightText}>{stripEmojis(insight)}</Text>
                                            </View>
                                        )) : <Text style={{fontSize: 10, color: 'grey'}}>Nenhuma sugestão.</Text>}
                                    </View>
                                </View>
                                {/* Removido a seção "Conclusões" pois não é passada por 'page.jsx' */}
                                <Text style={pdfStyles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
                            </Page>
                        </Document>
                    );
                };
                
                // Sinaliza que os componentes PDF estão prontos
                setIsClient(true);

            } catch (error) {
                console.error("Falha ao carregar a biblioteca PDF:", error);
                // Poderia setar um estado de erro aqui para o usuário
            }
        };

        loadPdfLibrary();
        
    }, []); // Array vazio garante que rode apenas uma vez, no mount do cliente


    // --- Lógica de Renderização do Botão ---
    // ADICIONADO: 'justify-center' e 'min-w-36' para tamanho consistente

    if (!isClient) {
        // Estado inicial (ou SSR)
        return (
            <button className="flex items-center justify-center gap-2 px-4 py-2 min-w-36 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow cursor-not-allowed opacity-50" disabled>
                <Loader2 className="animate-spin h-5 w-5" /> 
                <span>Carregando PDF...</span> 
            </button>
        );
    }
    
    // --- O cliente carregou, isClient é true, componentes PDF estão definidos ---

    if (!selectedLaunch || isLoadingDebrief) {
        return ( 
            <button className="flex items-center justify-center gap-2 px-4 py-2 min-w-36 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow cursor-not-allowed opacity-50" disabled> 
                {isLoadingDebrief ? <Loader2 className="animate-spin h-5 w-5" /> : <Download size={18} />} 
                <span>{isLoadingDebrief ? "Carregando..." : "Salvar PDF"}</span> 
            </button> 
        );
    }
    if (isCapturingImages) {
        return ( 
            <button className="flex items-center justify-center gap-2 px-4 py-2 min-w-36 text-sm font-semibold text-white bg-blue-800 rounded-lg shadow cursor-not-allowed opacity-70" disabled> 
                <Loader2 className="animate-spin h-5 w-5" /> 
                <span>Capturando...</span> 
            </button> 
        );
    }
    if (chartImages) {
        // Se chartImages estiver pronto E PDFDownloadLink foi carregado
        if (PDFDownloadLink && DebriefingPDFDocument) {
            const pdfData = { ...data };
            return ( 
                <PDFDownloadLink 
                    document={<DebriefingPDFDocument data={pdfData} images={chartImages} />} 
                    fileName={`debriefing_conversao_${selectedLaunch.substring(0, 8)}.pdf`} 
                    className="flex items-center justify-center gap-2 px-4 py-2 min-w-36 text-sm font-semibold text-white bg-green-600 rounded-lg shadow hover:bg-green-700 transition-colors"
                > 
                    {({ blob, url, loading, error }) => 
                        loading ? ( 
                            <> <Loader2 className="animate-spin h-5 w-5" /> <span>Gerando PDF...</span> </> 
                        ) : ( 
                            <> <FileDown className="h-5 w-5" /> <span>Baixar PDF</span> </> 
                        )
                    } 
                </PDFDownloadLink> 
            );
        } else {
             // Caso raro onde chartImages está pronto, mas a biblioteca PDF ainda não (ou falhou)
            return ( 
                <button className="flex items-center justify-center gap-2 px-4 py-2 min-w-36 text-sm font-semibold text-white bg-yellow-600 rounded-lg shadow cursor-not-allowed opacity-70" disabled> 
                    <Loader2 className="animate-spin h-5 w-5" /> 
                    <span>Finalizando...</span> 
                </button> 
            );
        }
    }
    // Estado inicial: Preparar PDF
    return ( 
        <button 
            onClick={captureChartImages} 
            className="flex items-center justify-center gap-2 px-4 py-2 min-w-36 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 transition-colors" 
            disabled={isLoadingDebrief}
        > 
            <Download size={18} /> 
            <span>Preparar PDF</span> 
        </button> 
    );
};

export default PDFButtonWrapper;
