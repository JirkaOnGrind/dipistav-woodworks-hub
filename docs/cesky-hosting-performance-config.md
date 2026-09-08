# Český hosting (THINline): cache a SPA fallback

Produkční obsah se nahrává **výhradně z `dist/client`**. Doporučená varianta je požádat
podporu Českého hostingu o vložení pravidel přímo do konfigurace domény (VirtualHost).
Poskytovatel sám upozorňuje, že zapnutý `.htaccess` může webserver zpomalit až o 20 % a
ve výchozím stavu není povolený.

## Doporučený požadavek pro podporu

Nahraďte `/ABSOLUTNI/CESTA/WEBU` skutečným DocumentRootem domény:

```apache
<Directory "/ABSOLUTNI/CESTA/WEBU">
    DirectoryIndex index.html
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]
    RewriteRule ^ /index.html [L]
</Directory>

<LocationMatch "^/assets/">
    Header always set Cache-Control "public, max-age=31536000, immutable"
</LocationMatch>

<FilesMatch "\.html$">
    Header always set Cache-Control "no-cache, must-revalidate"
</FilesMatch>
```

První pravidlo ponechá existující soubory a adresáře beze změny, takže prerenderované
`category/*/index.html` zůstanou použité. Teprve neexistující klientská URL spadne na
kořenový `index.html`. Dlouhá neměnná cache platí pouze pro hashované soubory ve
`/assets/`; HTML se vždy revaliduje, aby po FTP nasazení neodkazovalo na staré chunky.

Výchozí gzip komprese Českého hostingu už zahrnuje HTML, CSS a JavaScript. WebP ani jiné
obrázky se znovu gzipovat nemají.

## Záložní `.htaccess` varianta

Použijte ji pouze po zapnutí `.htaccess` v klientské sekci a po ověření na testovací
subdoméně:

```apache
DirectoryIndex index.html
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteRule ^ index.html [L]

<IfModule mod_headers.c>
    <If "%{REQUEST_URI} =~ m#^/assets/#">
        Header always set Cache-Control "public, max-age=31536000, immutable"
    </If>
    <FilesMatch "\.html$">
        Header always set Cache-Control "no-cache, must-revalidate"
    </FilesMatch>
</IfModule>
```

Po nasazení ověřte přímý vstup i refresh `/category/tramy`, `/doprava` a `/o-nas` a
hlavičky příkazem `curl -I` pro HTML i jeden soubor z `/assets/`.

## Zdroje

- https://www.cesky-hosting.cz/napoveda/webserver-ftp-subdomeny/htaccess-mod-rewrite/
- https://www.cesky-hosting.cz/napoveda/webserver-ftp-subdomeny/cachovani-obsahu/
- https://www.cesky-hosting.cz/napoveda/webserver-ftp-subdomeny/gzip-komprese-prenosu/
- https://www.cesky-hosting.cz/webhosting/technicke-informace/
