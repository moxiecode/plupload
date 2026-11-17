PWD=`pwd`
YETI=$PWD/../../.

rm -rf build_tmp
mkdir build_tmp
cd build_tmp

mkdir stage
rsync -av --exclude '.git*' --exclude 'test/' --exclude 'scripts/' $YETI stage
YETI=$PWD/stage

ROOT=$PWD/root
BIN=$ROOT/usr/local/libexec/yeti
NODE=$BIN/node

mkdir -p $BIN
cp /usr/local/bin/node $NODE

chmod +x $NODE

_NPM_ROOT=$ROOT/usr/local/lib/node
_NPM_FAKE_ROOT=$PWD/npm

mkdir -p $_NPM_ROOT/.npm/.cache
rsync -av ../npm-cache/ $_NPM_ROOT/.npm/

$NODE `brew --prefix node`/lib/node/.npm/npm/active/package/cli.js \
    --root $_NPM_ROOT \
    --binroot $BIN \
    install $YETI

rsync -avz $_NPM_ROOT/.npm/.cache ../npm-cache
rm -rf $_NPM_ROOT/.npm/.cache

# fixup path:
ROOTBIN=$ROOT/usr/local/bin
mkdir -p $ROOTBIN
sed -e s#./../../lib/node#/usr/local/lib/node# \
    -e s#/Users/[A-Za-z/]*/build_tmp/root## \
    $BIN/yeti > $ROOTBIN/yeti

chmod +x $ROOTBIN/yeti

freeze -v ../Yeti.packproj

hdiutil create -srcfolder dmg -volname "Yeti" -fs HFS+ -fsargs "-c c=64,a=16,e=16" -format UDRW -size 50000k build_tmp.dmg
hdiutil attach -readwrite -noverify -noautoopen build_tmp.dmg

sleep 2

#           set background picture of theViewOptions to file ".background:'${backgroundPictureName}'"
echo '
   tell application "Finder"
     tell disk "Yeti"
           open
           set current view of container window to icon view
           set toolbar visible of container window to false
           set statusbar visible of container window to false
           set the bounds of container window to {100, 100, 400, 400}
           set theViewOptions to the icon view options of container window
           set arrangement of theViewOptions to not arranged
           set icon size of theViewOptions to 120
           set position of item "Yeti.pkg" of container window to {150, 90}
           close
           open
           update without registering applications
           delay 5
           eject
     end tell
   end tell
' | osascript

chmod -Rf go-w /Volumes/Yeti

sync
sync

sleep 1

hdiutil detach /Volumes/Yeti
hdiutil convert build_tmp.dmg -format UDZO -imagekey zlib-level=9 -o Yeti.dmg
hdiutil internet-enable Yeti.dmg
mv -f Yeti.dmg ..

cd ..
