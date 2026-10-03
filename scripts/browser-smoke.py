"""Optional functional browser check. Start `npm start` before running this script.

Requires Python's Playwright package and Chromium. No production dependency.
Screenshots and an example exported run are written to ignored artifacts/.
"""
from pathlib import Path
import json
import os
import shutil
import subprocess

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
artifacts = root / 'artifacts'
artifacts.mkdir(exist_ok=True)
errors = []
executable = os.environ.get('BROWSER_EXECUTABLE') or shutil.which('chromium')

with sync_playwright() as p:
    browser = p.chromium.launch(
        **({'executable_path': executable} if executable else {}),
        headless=True,
        args=['--disable-dev-shm-usage'],
    )
    page = browser.new_page(viewport={'width': 1500, 'height': 1100}, accept_downloads=True)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(os.environ.get('SIMULATION_URL', 'http://127.0.0.1:3000/'), wait_until='networkidle')
    assert page.locator('#council-rows tr').count() == 6
    assert 'Converged in 10 rounds' in page.locator('#run-status').inner_text()
    assert page.locator('#shock').is_disabled()
    baseline_prices = page.locator('#price-list').inner_text()

    page.locator('label.scenario-card').filter(has=page.locator('input[value=energy]')).click()
    assert page.locator('#scenario-label').inner_text() == 'Energy shortfall'
    assert not page.locator('#shock').is_disabled()
    assert page.locator('#price-list').inner_text() != baseline_prices
    page.locator('#timeline').evaluate("el => {el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));}")
    assert page.locator('#round-badge').inner_text() == 'ROUND 0'
    assert 'has not converged' in page.locator('#allocation-note').inner_text()
    page.get_by_role('button', name='Play planning rounds', exact=True).click()
    page.wait_for_function(
        "document.getElementById('play').getAttribute('aria-label')==='Play planning rounds'",
        timeout=10000,
    )
    assert page.locator('#round-badge').inner_text() == 'ROUND 10'

    with page.expect_download() as download:
        page.get_by_role('button', name='Export run', exact=True).click()
    saved_path = artifacts / 'energy-seed-42.json'
    download.value.save_as(saved_path)
    saved = json.loads(saved_path.read_text())
    assert saved['config']['scenario'] == 'energy'
    assert saved['outcome'] == 'converged'
    replay = subprocess.check_output([
        'node', '--input-type=module', '-e',
        "import {readFileSync} from 'node:fs'; import {simulate} from './src/model.js'; "
        "const saved=JSON.parse(readFileSync(process.argv[1],'utf8')); "
        "process.stdout.write(JSON.stringify(simulate(saved.config)));",
        str(saved_path),
    ], cwd=root, text=True)
    assert json.loads(replay) == saved, 'Browser export differs from Node replay'
    with page.expect_download() as download:
        page.locator('#csv').click()
    csv_path = artifacts / 'energy-seed-42.csv'
    download.value.save_as(csv_path)
    assert len(csv_path.read_text().strip().splitlines()) == len(saved['rounds']) + 1

    page.locator('#reset').click()
    assert page.locator('#scenario-label').inner_text() == 'Steady state'
    page.locator('#import-file').set_input_files(saved_path)
    page.wait_for_function("document.getElementById('scenario-label').textContent==='Energy shortfall'")
    assert page.locator('#toast').inner_text().startswith('Reproduced')
    fingerprint = page.locator('#council-rows').inner_text()
    page.locator('.advanced summary').click()
    page.locator('#seed').fill('77')
    page.locator('#seed').press('Tab')
    assert page.locator('#seed-label').inner_text() == 'SEED 77'
    assert page.locator('#council-rows').inner_text() != fingerprint
    bad = json.dumps({'modelVersion': 'invalid', 'config': saved['config']}).encode()
    page.locator('#import-file').set_input_files({
        'name': 'invalid.json', 'mimeType': 'application/json', 'buffer': bad,
    })
    page.wait_for_function("document.getElementById('toast').textContent.startsWith('Import failed:')")
    assert page.locator('#seed-label').inner_text() == 'SEED 77'

    page.locator('#reset').click()
    page.locator('.advanced summary').click()
    page.locator('#toast').evaluate('el => {el.hidden=true;}')
    page.screenshot(path=str(artifacts / 'dashboard-desktop.png'), full_page=True)
    for width in [390, 760, 1000]:
        page.set_viewport_size({'width': width, 'height': 844})
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'Overflow at {width}px'
        if width == 390:
            page.screenshot(path=str(artifacts / 'dashboard-mobile.png'), full_page=True)
    assert not errors, errors
    print('Browser checks passed: scenario updates, playback, seed changes, JSON/CSV '
          'downloads, exact Node replay, import, invalid import handling, three responsive '
          'widths, and no JavaScript errors.')
    browser.close()
