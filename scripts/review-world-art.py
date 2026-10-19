"""Render desktop stacks, tall phone crops and close repeat seams."""
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parent.parent; out=root/'src/assets/sketchbg'; raw=root/'art/raw/worlds'
groups=[('ink',['ink_far','ink_mid']),('pixel',['px_sky','px_far','px_mid']),('watercolour',['wc_sky','wc_cloud','wc_sea_far','wc_sea_near']),('comic',['cm_space','cm_earth','cm_moon']),('cartoon',['hs_sky','hs_sun','hs_cloud_far','hs_cloud_near'])]
sheet=Image.new('RGB',(1280,5*400),'#b9b7ad');d=ImageDraw.Draw(sheet)
for j,(label,names) in enumerate(groups):
 im=Image.new('RGBA',(1536,1024),'#f3eee1')
 for n in names: im.alpha_composite(Image.open(out/(n+'.webp')).convert('RGBA'))
 wide=im.copy();wide.thumbnail((555,370));sheet.paste(wide,(0,j*400+25));d.text((4,j*400+5),label+' desktop stack',fill='black')
 # 390x844 centre cover crop from the same full frame.
 w=round(1024*390/844); phone=im.crop(((1536-w)//2,0,(1536+w)//2,1024));phone.thumbnail((171,370));sheet.paste(phone,(570,j*400+25));d.text((570,j*400+5),'phone centre',fill='black')
 # Close seam detail, last and first 128 pixels joined.
 n=next((x for x in names if x in {'ink_mid','px_mid','wc_sea_near','hs_cloud_near'}),None)
 if n:
  tile=Image.open(out/(n+'.webp')).convert('RGBA')
  z=Image.new('RGBA',(256,1024),'#b9b7ad');z.alpha_composite(tile.crop((1408,0,1536,1024)),(0,0));z.alpha_composite(tile.crop((0,0,128,1024)),(128,0));z.thumbnail((171,370));sheet.paste(z,(780,j*400+25));d.text((780,j*400+5),'repeat seam detail',fill='black')
sheet.save(raw/'stacks.png')
