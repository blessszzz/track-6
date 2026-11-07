"""Generate the checked-in icons using Pillow and the existing stethoscope motif."""
import sys
from pathlib import Path
sys.path.insert(0, '.test-deps')
from PIL import Image, ImageDraw
out=Path('web/icons'); out.mkdir(exist_ok=True)
im=Image.new('RGB',(1024,1024),'#0f6b73'); d=ImageDraw.Draw(im)
d.arc((275,245,615,620),0,180,fill='white',width=38)
for x in (275,615):
    d.line((x,245,x,432),fill='white',width=38)
    d.ellipse((x-26,218,x+26,270),fill='white')
d.line((445,620,445,675),fill='white',width=38)
d.arc((426,556,759,795),0,180,fill='white',width=38)
d.line((759,675,759,550),fill='white',width=38)
d.ellipse((700,455,818,573),fill='white'); d.ellipse((731,486,787,542),fill='#0f6b73')
for name,size in [('icon-192.png',192),('icon-512.png',512),('maskable-512.png',512),('apple-touch-icon.png',180)]:
    im.resize((size,size),Image.Resampling.LANCZOS).save(out/name)

