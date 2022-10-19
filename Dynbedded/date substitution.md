# English

> [[#Deutsch]] gibt es auch!

Hi, let's take a closer look on how date stubstitution works.

## Generell Date Substitution
Instead of just linking to static notes like the normal ![[]] embedded you can also use date substituion = dynamic generated dates. (I guess there is more then one reason this plugin is called [[Dynbedded]])

You can substitute part of the notename with the current date in any format you like [based on Moment.js Date format](https://momentjs.com/docs/#/displaying/format/).

### Simple Date Format
So the following
~~~
```dynbedded
[[{{YYYY-MM-DD}}]]
```
~~~
will display the note for today with the format YYYY-MM-DD, e.g. 2022-10-15

### Targeting Header Sections
You can also also directly target header sections and [[Dynbedded]] will only display the section of the header.

So the following
~~~
```dynbedded
[[{{YYYY-MM-DD}}#Header is possible too]]
```
~~~
will embedded the content of the "Header is possible too" section of the note with a name the current date in "YYYY-MM-DD" format, e.g 2022-10-14

### Customized Date Format
You can run wild with your date formats, just make sure you stick to the Moment.js Date format ([[#Generell Date Substitution|see above]])

So for example the following
~~~
```dynbedded
[[{{[DP-]YYYY-MM-DD}}]]
```
~~~
will embedded the content of the note with the current date in the format of DP-YYYY-MM-DD, e.g DP-2022-10-14.

Have fun....

## Relative Date Substitution
You have two options to work with positive and negative relative dates.
So you can go into the future, or the past.

### Simple Relative Date Substitution
When you use the date substituion you can just add a **|** behind the date format (Just like using an alias with the normal Obsidian Links) and create a relative date of your choosing.

So out of 
```
{{YYYY-MM-DD}}
```
for today becomes
```
{{YYYY-MM-DD|-1}}
```
for yesterday.

Using a normal number like -1, 1 etc is the first option. This will create a releative date based on adding or subtracting the number of **days** you specified.

All other option from [[#Generell Date Substitution]] will work with this.

### Advanced Relative Date Substitution
The more advanced version of relative date substitution allows a lot more, jumping days, weeks, month, years... etc. but it is also a little bit more complicated (who would have guessed 🤔)

So out of 
```
{{YYYY-MM-DD}}
```
for today becomes
```
{{YYYY-MM-DD|P-1D}}
```
for yesterday.

This is similar to [Templaters usage](https://silentvoid13.github.io/Templater/internal-functions/internal-modules/date-module.html) and more information can be found on the [ ISO 8601 description of Wikipedia](https://en.wikipedia.org/wiki/ISO_8601#Durations).

All other option from [[#Generell Date Substitution]] will work with this.

# Deutsch

Hi, last uns einen genaueren Blick darauf werfen wie die Datum Erzeugung funktioniert.

## Generelle Datum Erzeugung
Anstelle von nur nicht veränderlichen Notizen einzubinden wie ![[]] kann man auch ein dynamisches Daum erzeugen. (Sieht so aus als gebe es mehr wie einen Grund warum das Plugin [[Dynbedded]] heißt.)

Ihr könnt einen Teil des Notiznamen mit dem aktuellen Datum in einem Format wie ihr es wollt [basierend auf dem Moment.js Datum Format](https://momentjs.com/docs/#/displaying/format/) ersetzen.

### Einfaches Datum Format
Aus dem folgenden
~~~
```dynbedded
[[{{YYYY-MM-DD}}]]
```
~~~
wird dann die Anzeige einer Notiz mit dem Datum von heute im Format YYYY-MM-DD, z.B. 2022-10-15

### Auswahl von Header Sektionen
Ihr könnt auch direkt Header Sektionen auswählen und [[Dynbedded]] zeigt dann nur die Informationen dieser Sektion an.

Aus dem folgenden
~~~
```dynbedded
[[{{YYYY-MM-DD}}#Header is possible too]]
```
~~~
wird dann die Anzeige der Header Sektion mit dem Namen "Header is possible too" der Notize mit dem aktuellen Datum im Format "YYYY-MM-DD" , z.B. 2022-10-14

### Angepasste Datum Formate
Ihr könnt euch so richtig austoben mit den Formaten, stellt nur sicher das Ihr euch an das Moment.js Datum Format haltet.([[#Generelle Datum Erzeugung|siehe oben]])

Zum Beispiel wird aus dem folgenden
~~~
```dynbedded
[[{{[DP-]YYYY-MM-DD}}]]
```
~~~
eine Anzeige der Notiz mit dem aktuellen Datum im Format DP-YYYY-MM-DD, z.B. DP-2022-10-14.

Viel Spaß

## Relative Datum Erzeugung
Ihr habt zwei Möglichkeiten mit positiven und negativen relativen Datum zu arbeiten.
Ihr könnt also in die Zukunft oder die Vergangenheit gehen.

### Einfache Relative Datum Erzeugung
Wenn Ihr die Datum Erzeugung benutzt könnt ihr einfach ein **|** hinter dem Datum Format anbringen (Als würdet ihr ein Alias beim normalen Obsidian Link nutzen wollen) und dann ein relatives Datum euerer Wahl erzeugen. 

Aus
```
{{YYYY-MM-DD}}
```
für heute wird
```
{{YYYY-MM-DD|-1}}
```
für gestern.

Das nutzen einer normalen Zahl wie -1, 1 etc. ist die erste Option. Dies erstellt ein relatives Datum durch hinzufügen oder verringern der angegebenen **Tage**. 

Alle Optionen die vorher in [[#Generelle Datum Erzeugung]] genannt wurden funktionieren hiermit.

### Fortgeschrittene Relative Datum Erzeugung
Die etwas fortgeschritterne Art der relativen Datum Erzeugung erlaubt vieles mehr. Sprünge von Tagen, Monaten, Jahre etc. aber sie ist auch ein wenig komplizierter (Wer hätte das gedacht 🤔)

Aus
```
{{YYYY-MM-DD}}
```
für heute wird
```
{{YYYY-MM-DD|P-1D}}
```
für gestern.

Dies ist wie die [Nutzung in Templater](https://silentvoid13.github.io/Templater/internal-functions/internal-modules/date-module.html) und mehr Informationen kann man auf der [ISO 8601 Beschreibung auf  Wikipedia](https://en.wikipedia.org/wiki/ISO_8601#Durations) nachlesen.

Alle Optionen die vorher in [[#Generelle Datum Erzeugung]] genannt wurden funktionieren hiermit.