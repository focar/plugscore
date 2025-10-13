//src/app/api/send-message/route.js
import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

// (O código da função sleep continua o mesmo)
function sleep(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    return new Promise(resolve => setTimeout(resolve, delay * 1000));
}

export async function POST(request) {
    let browser;
    let page; 
    try {
        const { contactList, message, delayOption } = await request.json();

        // (Todo o código de sucesso dentro do 'try' continua exatamente o mesmo)
        if (!contactList || !message || !delayOption) { return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 }); }
        let minDelay, maxDelay;
        switch (delayOption) {
            case 'rapido': minDelay = 6; maxDelay = 10; break;
            case 'lento': minDelay = 19; maxDelay = 30; break;
            default: minDelay = 11; maxDelay = 18; break;
        }
        browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        page = await context.newPage();
        await page.goto('https://web.whatsapp.com');
        await page.waitForSelector('div#pane-side', { timeout: 300000 });
        for (const contact of contactList) {
            let personalizedMessage = message;
            for (const key in contact) {
                const placeholder = `{${key.toUpperCase()}}`;
                const regex = new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
                personalizedMessage = personalizedMessage.replace(regex, contact[key]);
            }
            const phoneNumber = contact.telefone_formatado;
            const url = `https://web.whatsapp.com/send?phone=${phoneNumber}`;
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            const messageBoxSelector = 'div[role="textbox"][contenteditable="true"]';
            await page.waitForSelector(messageBoxSelector, { state: 'visible', timeout: 60000 });
            const messageBox = page.locator(messageBoxSelector);
            await messageBox.fill(personalizedMessage);
            await page.waitForTimeout(1000);
            const sendButton = page.getByRole('button', { name: 'Enviar' });
            await sendButton.waitFor({ state: 'visible', timeout: 10000 });
            await sendButton.click();
            await sleep(minDelay, maxDelay);
        }
        await browser.close();
        return NextResponse.json({ success: true, message: 'Todas as mensagens foram enviadas com sucesso!' });

    } catch (error) {
        console.error('Erro na automação do WhatsApp:', error);
        let htmlContent = '';
        if (page) {
            // Captura o HTML da página no momento do erro
            htmlContent = await page.content();
        }
        
        if (browser) {
            await browser.close();
        }

        // ### MUDANÇA AQUI: Envia o erro E o HTML de volta para a página ###
        return NextResponse.json({ 
            error: `Ocorreu um erro: ${error.message}`,
            html: htmlContent // Adiciona o HTML na resposta
        }, { status: 500 });
    }
}