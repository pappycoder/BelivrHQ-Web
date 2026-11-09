"""Build the hosted support handoff from the generated brand assets."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
folder = root / 'docs/support-branding'
with ZipFile(folder / 'belivrhq-tawk-brand-kit.zip', 'w', ZIP_DEFLATED) as kit:
    kit.write(folder / 'reference-settings.json', 'reference-settings.json')
    for suffix in ['logo', 'emblem', 'lockup-light', 'lockup-navy']:
        asset = root / 'public/brand' / f'belivrhq-{suffix}.png'
        kit.write(asset, asset.name)
print('BelivrHQ support brand kit generated. Hosted settings require dashboard access.')
