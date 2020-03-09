# note-editor


### 環境構築

1. chrome に導入する  
https://chrome.google.com/webstore/detail/mobx-developer-tools/pfgnfdagidkfgccljigdamigbcnndkod
1. `assets/audio` フォルダと `assets/musicGameSystems` フォルダを生成する

### 開発

1. `yarn install` 
1. `yarn run dev` と `yarn run dev:electron` を同時に実行 
1. プロジェクト固有のスクリプトがある場合は `yarn run plugin` も実行

### ビルド

1. `yarn run build:win` または `yarn run build:mac`
1. 生成された実行ファイルの階層に `assets/audio` フォルダと `assets/musicGameSystems` フォルダを生成する
