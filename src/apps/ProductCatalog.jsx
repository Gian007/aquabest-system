import {useRef,useState} from 'react';
import {FiPlus,FiEdit2,FiPackage,FiImage,FiCheck,FiX} from 'react-icons/fi';
import {DEMO_PRODUCTS,DEMO_PRICES,formatMoney} from '../data/managerDemo.js';
const seed=DEMO_PRODUCTS.map(p=>({id:p.id,name:p.label+' · '+p.shape,category:'Water Refill',description:'Purified water refill',price:DEMO_PRICES[p.id],active:true,image:'',availability:'Walk-in & Online'}));
const empty={name:'',category:'Water Refill',description:'',price:'',active:true,image:'',availability:'Walk-in & Online'};
export default function ProductCatalog({onEvent}){
 const [products,setProducts]=useState(seed);
 const [editing,setEditing]=useState(null);
 const [open,setOpen]=useState(false);
 const [form,setForm]=useState(empty);
 const input=useRef(null);
 const set=(key,value)=>setForm(f=>({...f,[key]:value}));
 const start=(p=null)=>{setEditing(p?.id||null);setForm(p?{...p}:empty);setOpen(true)};
 const image=e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024){onEvent('Use JPG, PNG or WebP under 2 MB.');return}
  const reader=new FileReader();reader.onload=()=>set('image',String(reader.result));reader.readAsDataURL(file);
 };
 const save=()=>{
  const amount=Number(form.price);
  if(!form.name.trim()||form.price===''||!Number.isFinite(amount)||amount<0){onEvent('Product needs a name and valid nonnegative price.');return}
  if(editing)setProducts(old=>old.map(p=>p.id===editing?{...form,price:amount}:p));
  else setProducts(old=>[{...form,id:'product-'+Date.now(),price:amount},...old]);
  onEvent((editing?'Updated':'Added')+' product: '+form.name);setOpen(false);setEditing(null);
 };
 const toggle=p=>{setProducts(old=>old.map(x=>x.id===p.id?{...x,active:!x.active}:x));onEvent((p.active?'Deactivated':'Activated')+' product: '+p.name)};
 return <>
  <div className="mgmt-heading"><div className="overline">Product catalog</div><h1>Products & Services</h1><p>Update product images, prices, descriptions and availability for future orders.</p></div>
  <div className="owner-actions" style={{justifyContent:'space-between',alignItems:'center'}}><span className="mgmt-sub">{products.filter(p=>p.active).length} active · {products.length} products</span><button className="mgmt-btn" onClick={()=>start()}><FiPlus/> Add Product</button></div>
  {open&&<div className="mgmt-card owner-form"><div className="mgmt-section-title"><h2>{editing?'Edit Product':'New Product'}</h2><button className="mgmt-link" onClick={()=>setOpen(false)}><FiX/> Close</button></div>
   <div className="owner-product-upload"><div className="owner-product-image">{form.image?<img src={form.image} alt="Product preview"/>:<FiImage size={25}/>}</div><div><button className="mgmt-btn secondary" onClick={()=>input.current?.click()}>Upload Image</button><p className="mgmt-sub">JPG, PNG, WebP · Max 2 MB</p><input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={image} style={{display:'none'}}/></div></div>
   <div className="mgmt-formgrid">
    <div className="mgmt-field"><label>Product Name</label><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g., 5-Gallon Refill"/></div>
    <div className="mgmt-field"><label>Category</label><select value={form.category} onChange={e=>set('category',e.target.value)}><option>Water Refill</option><option>Container</option><option>Bundle</option><option>Other</option></select></div>
    <div className="mgmt-field"><label>Price (₱)</label><input type="number" min="0" step="0.01" value={form.price} onChange={e=>set('price',e.target.value)}/></div>
    <div className="mgmt-field"><label>Available Through</label><select value={form.availability} onChange={e=>set('availability',e.target.value)}><option>Walk-in & Online</option><option>Walk-in Only</option><option>Online Only</option></select></div>
    <div className="mgmt-field owner-span"><label>Description</label><textarea value={form.description} onChange={e=>set('description',e.target.value)} rows="3" placeholder="Description shown in product catalog"/></div>
   </div><div className="owner-actions"><button className="mgmt-btn" onClick={save}><FiCheck/> Save Product</button><button className="mgmt-btn secondary" onClick={()=>setOpen(false)}>Cancel</button></div>
  </div>}
  <div className="owner-product-list">{products.map(p=><article className="mgmt-card owner-product" key={p.id}>
   <div className="owner-product-image">{p.image?<img src={p.image} alt={p.name}/>:<FiPackage size={25}/>}</div>
   <div className="owner-product-info"><strong>{p.name}</strong><p className="mgmt-sub">{p.category} · {p.availability}</p><strong>{formatMoney(p.price)}</strong><span className={'owner-state '+(p.active?'active':'')}>{p.active?'Active':'Inactive'}</span></div>
   <div className="owner-product-actions"><button className="mgmt-btn secondary" onClick={()=>start(p)}><FiEdit2/> Edit</button><button className="mgmt-btn secondary" onClick={()=>toggle(p)}>{p.active?'Deactivate':'Activate'}</button></div>
  </article>)}</div>
  <div className="mgmt-notice">Demo catalog only. Image uploads are held in browser memory. Live customer ordering and POS still use existing sample products until Supabase catalog integration. Existing sales records must retain their original prices.</div>
 </>;
}
