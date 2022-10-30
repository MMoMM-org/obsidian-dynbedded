mkdir $1
cp -r build/*.* $1
zip -r $1.zip $1
echo "Zipping done"
