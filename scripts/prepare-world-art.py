"""Key world layers, repair horizontal repeats, export WebP and review sheets.

Run from any directory: python3 scripts/prepare-world-art.py
Requires Pillow, NumPy and SciPy. Full-frame alignment is preserved.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
root=Path(__file__).resolve().parent.parent; raw=root/'art/raw/worlds'; out=root/'src/assets/sketchbg'
tiles={'ink_far','ink_mid','px_far','px_mid','wc_cloud','wc_sea_far','wc_sea_near','hs_cloud_far','hs_cloud_near'}
plates={'px_sky','wc_sky','cm_space','hs_sky'}
rows=[]
for p in sorted(raw.glob('*.png')):
 n=p.stem
 if n in {'contact','seams','stacks'}: continue
 im=Image.open(p).convert('RGB'); rgb=np.asarray(im).astype(float)
 if n not in plates:
  m=np.minimum(rgb[...,0],rgb[...,2])-rgb[...,1]
  rgb[m>=215]=[255,0,255]
  a=1-np.clip((m-40)/175,0,1)
  fg=np.clip((rgb-(1-a[...,None])*np.array([255,0,255]))/np.maximum(a,1e-3)[...,None],0,255)
  fg[...,1]=np.maximum(fg[...,1],np.minimum(fg[...,0],fg[...,2])-60)
  a[a<.04]=0
  rim=nd.distance_transform_edt(a>.05)<18
  if n == "wc_cloud": rim=np.ones_like(a,dtype=bool)
  spill=np.maximum(np.minimum(fg[...,0],fg[...,2])-fg[...,1],0)*rim
  fg[...,0]-=spill; fg[...,2]-=spill
  arr=np.dstack((fg,a*255))
 else: arr=np.dstack((rgb,np.full(rgb.shape[:2],255)))
 if n in tiles:
  # Crossfade corresponding edge neighbourhoods using premultiplied colour.
  # Both outside columns converge to the same average, with smooth falloff.
  a=arr[...,3:]/255; prem=np.concatenate((arr[...,:3]*a,arr[...,3:]),axis=2)
  band=96 if not n.startswith('px_') else 32
  for x in range(band):
   t=(1-x/(band-1))**2*.5
   l=prem[:,x].copy(); r=prem[:,-1-x].copy()
   prem[:,x]=l*(1-t)+r*t; prem[:,-1-x]=r*(1-t)+l*t
  arr=np.concatenate((prem[...,:3]/np.maximum(prem[...,3:]/255,1e-3),prem[...,3:]),axis=2)
 im=Image.fromarray(np.clip(arr,0,255).astype('uint8'),'RGBA')
 if n in plates: im=im.convert('RGB')
 if im.width>2048 and n not in tiles: im.thumbnail((2048,2048),Image.Resampling.LANCZOS)
 im.save(out/(n+'.webp'),quality=80,method=6,exact=True)
 rows.append((n,im.size,round((out/(n+'.webp')).stat().st_size/1024,1)))
# Contact sheet: keyed layers displayed on neutral gray for honest alpha review.
sheet=Image.new('RGB',(1280,((len(rows)+3)//4)*240),'#d0cec5'); d=ImageDraw.Draw(sheet)
for i,(n,size,kb) in enumerate(rows):
 im=Image.open(out/(n+'.webp')).convert('RGBA'); im.thumbnail((312,208)); x=(i%4)*320;y=(i//4)*240
 sheet.paste(im,(x,y+23),im);d.text((x+4,y+5),n,fill='black')
sheet.save(raw/'contact.png')
seam=Image.new('RGB',(1000,len(tiles)*360),'#aaa99f');d=ImageDraw.Draw(seam)
for i,n in enumerate(sorted(tiles)):
 p=out/(n+'.webp')
 if not p.exists():continue
 im=Image.open(p).convert('RGBA'); im.thumbnail((500,333)); y=i*360+22
 seam.paste(im,(0,y),im);seam.paste(im,(im.width,y),im);d.text((5,i*360+3),n+'  |  repeat boundary at x='+str(im.width),fill='black')
seam.save(raw/'seams.png')
print('\n'.join(f'{n}: {sz[0]}x{sz[1]}, {kb} KB' for n,sz,kb in rows))
