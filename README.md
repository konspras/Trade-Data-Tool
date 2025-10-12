# How to use

The website is hosted here: https://konspras.github.io/Trade-Data-Tool/

To run locally:
* pip install -r requirements.txt
* Make sure you are using node version v20.19.0 `node -v`
* In `src/web` run `npm install` to install all dependencies.
* In `src/web` run `npm run dev`.

To deploy:
* From the root of the repo run `deploy.sh` - this calls `npm run build` and places the generated static files in docs/
* Add changes to docs/ and push.

To run the EDA:
`cd src/eda`
Run `jupyter notebook`

To re-pre-process the data:
* Download data from https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37
* (select HS92 and put it in data/BACI_HS92_V202501)
* run create_csvs.py
