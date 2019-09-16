const messages={en:{src:"Please specify the root source of your project.",output:"Please specify the output folder for the translation files.",config:"Please specify the path to Transloco config.",langs:"To which languages you want to create files for?",keepFlat:"Keep certain keys flat?",hasScope:"Do you have scopes defined?",keysFound:(e,s)=>`- ${e} keys were found in ${s} ${s>1?"files":"file"}.`,startBuild:e=>`Starting Translation ${e>1?"Files":"File"} Build`,startSearch:"Staring Search For Missing Keys",extract:"Extracting Template and Component Keys",creatingFiles:"Creating new translation files",merged:e=>`Existing translation file${e.length>1?"s were":" was"} found and merged 🧙`,checkMissing:"Checking for missing keys",pathDoesntExists:"The path provided for the translation files doesn't exists!",noTranslationFilesFound:e=>`No translation files found in the given path! \n ${e}`,summary:"Summary",noMissing:"No missing keys were found",defaultValue:"Enter default key value",addMissing:"Add missing keys automatically?",done:"Done!"},ru:{src:"Please specify the root source of your project.",output:"Please specify the output folder for the translation files.",langs:"Для каких языков вы хотите создать файлы",keysFound:(e,s)=>`- В ${s} ${s>1?"файлах":"файле"} найдено ${e} ключей.`,startBuild:e=>`Начало сборки ${e>1?"файлов":"файла"} перевода`,startSearch:"Staring Search For Missing Keys",extract:"Extracting Template and Component Keys",creatingFiles:"Создание новых файлов перевода",merged:e=>`Existing translation file${e.length>1?"s were":" was"} found and merged 🧙`,checkMissing:"Checking for missing keys",summary:"Summary",noMissing:"No missing keys were found",done:"Готово!"},fr:{src:"Please specify the root source of your project.",output:"Please specify the output folder for the translation files.",langs:"Pour quelles languages souhaitez vous créer des fichiers de traduction?",keysFound:(e,s)=>`- ${e} clés ${s} ${s>1?"fichiers":"fichier"}.`,startBuild:e=>`Initialisation de la traduction des ${e>1?"fichiers":"fichier"}`,startSearch:"Staring Search For Missing Keys",extract:"Extracting Template and Component Keys",creatingFiles:"Création des nouveaux fichiers de traduction",merged:e=>`Existing translation file${e.length>1?"s were":" was"} found and merged 🧙`,checkMissing:"Checking for missing keys",summary:"Summary",noMissing:"No missing keys were found",done:"Fini!"},es:{src:"Please specify the root source of your project.",output:"Please specify the output folder for the translation files.",langs:"¿Para qué idiomas desea crear archivos?",keysFound:(e,s)=>`- ${e} llaves fueron encontradas en ${s} ${s>1?"archivos":"archivo"}.`,startBuild:e=>`Iniciando la construcción del ${e>1?"archivos":"archivo"} de traducción`,startSearch:"Staring Search For Missing Keys",extract:"Extracting Template and Component Keys",creatingFiles:"Creando nuevos archivos de traducción",merged:e=>`Existing translation file${e.length>1?"s were":" was"} found and merged 🧙`,checkMissing:"Checking for missing keys",summary:"Summary",noMissing:"No missing keys were found",done:"¡Completo!"},ja:{},zh:{}};module.exports={getMessages:e=>messages[e]||messages.en};
