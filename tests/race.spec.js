import { test, expect } from '@playwright/test'

const EMAIL = 'pwtest.race@kulturg.test'
const PASSWORD = 'PwTest1234!'

test('Course aux Points — partie privée jouable jusqu\'à l\'arrivée', async ({ page }) => {
  // ── Connexion ──
  await page.goto('/auth')
  await page.getByRole('button', { name: 'Connexion' }).click()
  await page.locator('input[type=email]').fill(EMAIL)
  await page.locator('input[type=password]').fill(PASSWORD)
  await page.getByRole('button', { name: 'Se connecter' }).click()

  // Redirection vers l'accueil une fois connecté
  await expect(page).toHaveURL(/\/$|\/#?$/, { timeout: 15_000 })

  // ── Crée une partie privée personnalisée (5 questions, 10s) ──
  await page.goto('/multi')
  await page.getByRole('button', { name: /Créer une partie personnalisée/i }).click()
  await page.getByRole('button', { name: '10s', exact: true }).click()
  await page.getByRole('button', { name: '5', exact: true }).click()
  await page.getByRole('button', { name: /Créer la partie/i }).click()

  // ── Lobby ──
  await expect(page).toHaveURL(/\/race\/[A-Z0-9]{6}/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'Course aux Points' })).toBeVisible()
  const startBtn = page.getByRole('button', { name: /Lancer (en solo|la course)/i })
  await expect(startBtn).toBeEnabled({ timeout: 15_000 })
  await startBtn.click()

  // ── Partie en cours : on répond / on laisse filer jusqu'à l'arrivée ──
  const finished = page.getByRole('heading', { name: 'Arrivée !' })
  const counter  = page.locator('text=/Q\\s*\\d+\\s*\\/\\s*\\d+/').first()

  // Au moins la 1re question doit s'afficher
  await expect(counter).toBeVisible({ timeout: 20_000 })

  let lastQ = ''
  const deadline = Date.now() + 160_000
  while (Date.now() < deadline) {
    if (await finished.isVisible().catch(() => false)) break

    const label = await counter.textContent().catch(() => null)
    if (label && label !== lastQ) {
      lastQ = label
      // Répond selon le type de question visible
      const choice = page.getByTestId('race-choice').first()
      const openInput = page.getByPlaceholder(/Tape ta réponse/i)
      const listInput = page.getByPlaceholder(/Tape une réponse/i)
      const orderBtn  = page.getByRole('button', { name: /Valider le classement/i })

      if (await choice.isVisible().catch(() => false)) {
        await choice.click().catch(() => {})
      } else if (await orderBtn.isVisible().catch(() => false)) {
        await orderBtn.click().catch(() => {})
      } else if (await openInput.isVisible().catch(() => false)) {
        await openInput.fill('reponse')
        await openInput.press('Enter').catch(() => {})
      } else if (await listInput.isVisible().catch(() => false)) {
        // Question « liste » : on cite quelques réponses, la révélation est au temps écoulé (30 s)
        for (const a of ['France', 'Mars', 'Lion', 'Macron', 'Louis XIV']) {
          await listInput.fill(a)
          await listInput.press('Enter').catch(() => {})
        }
      }
    }
    await page.waitForTimeout(700)
  }

  await expect(finished).toBeVisible({ timeout: 10_000 })
  // Le récapitulatif et les boutons de fin sont présents
  await expect(page.getByText('Récapitulatif')).toBeVisible()
})
