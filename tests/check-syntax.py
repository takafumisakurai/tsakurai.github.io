from pathlib import Path
from html.parser import HTMLParser
import subprocess,tempfile,sys
node=sys.argv[1] if len(sys.argv)>1 else 'node'
class Scripts(HTMLParser):
 def __init__(self): super().__init__();self.items=[];self.active=False;self.text=''
 def handle_starttag(self,t,a):
  if t=='script':
   at=dict(a);self.active='src' not in at and at.get('type','') not in ('application/ld+json','application/json');self.text=''
 def handle_data(self,s):
  if self.active:self.text+=s
 def handle_endtag(self,t):
  if t=='script' and self.active:self.items.append(self.text);self.active=False
checks=[]
for p in sorted(Path('.').rglob('*.html')):
 if '.git' in p.parts:continue
 h=Scripts();h.feed(p.read_text())
 for i,s in enumerate(h.items):
  with tempfile.NamedTemporaryFile(suffix='.js',mode='w') as f:
   f.write(s);f.flush();r=subprocess.run([node,'--check',f.name],capture_output=True,text=True)
   if r.returncode:raise SystemExit(str(p)+' '+str(i)+' '+r.stderr)
  checks.append(str(p)+':inline'+str(i))
for p in sorted(Path('.').rglob('*.js')):
 if '.git' in p.parts:continue
 r=subprocess.run([node,'--check',str(p)],capture_output=True,text=True)
 if r.returncode:raise SystemExit(str(p)+' '+r.stderr)
 checks.append(str(p))
print('Syntax checks passed:',len(checks))
print('\n'.join(checks))
