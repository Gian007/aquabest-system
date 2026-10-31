import {useState} from 'react';
import {FiUserPlus,FiUser,FiClock,FiCheckCircle,FiActivity,FiBriefcase,FiEdit2} from 'react-icons/fi';
const initial=[
 {id:'emp-manager',name:'Manager',role:'Manager',contact:'',active:true,pos:true},
 {id:'emp-staffa',name:'Staff A',role:'Staff / Refiller',contact:'',active:true,pos:false},
 {id:'emp-staffb',name:'Staff B',role:'Staff / Refiller',contact:'',active:true,pos:true},
 {id:'emp-drivera',name:'Driver A',role:'Delivery',contact:'',active:true,pos:false},
 {id:'emp-driverb',name:'Driver B',role:'Delivery',contact:'',active:true,pos:false}
];
const blank={name:'',role:'Staff / Refiller',contact:'',pos:false};
export default function EmployeeDirectory({availability,orders,onEvent}){
 const [people,setPeople]=useState(initial);
 const [selected,setSelected]=useState(null);
 const [adding,setAdding]=useState(false);
 const [draft,setDraft]=useState(blank);
 const [advanced,setAdvanced]=useState(false);
 const picked=people.find(e=>e.id===selected);
 const assigned=orders.filter(o=>o.assigned===picked?.name);
 const finished=assigned.filter(o=>['Completed','Ready','Delivered'].includes(o.status)).length;
 const update=(id,field,value)=>{setPeople(old=>old.map(e=>e.id===id?{...e,[field]:value}:e));onEvent('Employee '+people.find(e=>e.id===id)?.name+': '+field+' updated')};
 const save=()=>{
  if(!draft.name.trim()){onEvent('Please enter employee full name.');return}
  const id='employee-'+Date.now();
  setPeople(old=>[...old,{...draft,id,active:true}]);setAdding(false);setDraft(blank);setSelected(id);onEvent('Created demo employee profile for '+draft.name);
 };
 return <>
  <div className="mgmt-heading"><div className="overline">Team directory</div><h1>Employee Management</h1><p>Employee profiles, attendance and work performance in one place.</p></div>
  <div className="owner-actions" style={{justifyContent:'space-between',alignItems:'center'}}><span className="mgmt-sub">{people.filter(p=>p.active).length} active · {people.length} sample profiles</span><button className="mgmt-btn" onClick={()=>{setAdding(!adding);setSelected(null)}}><FiUserPlus/> Add Employee</button></div>
  {adding&&<div className="mgmt-card owner-form"><h2 className="owner-subtitle">New Employee Account (Demo)</h2>
   <div className="mgmt-formgrid"><div className="mgmt-field"><label>Full Name</label><input value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))} placeholder="Employee full name"/></div>
   <div className="mgmt-field"><label>Mobile or Email</label><input value={draft.contact} onChange={e=>setDraft(v=>({...v,contact:e.target.value}))} placeholder="Contact (optional demo)"/></div>
   <div className="mgmt-field"><label>Primary Role</label><select value={draft.role} onChange={e=>setDraft(v=>({...v,role:e.target.value}))}><option>Manager</option><option>Staff / Refiller</option><option>Delivery</option></select></div></div>
   <p className="mgmt-sub">This creates a sample profile only. Production accounts will use a secure invitation and authentication.</p>
   <div className="owner-actions"><button className="mgmt-btn" onClick={save}>Create Demo Profile</button><button className="mgmt-btn secondary" onClick={()=>setAdding(false)}>Cancel</button></div>
  </div>}
  <div className="mgmt-card owner-directory">{people.map(e=><button key={e.id} className={'owner-person '+(selected===e.id?'selected':'')} onClick={()=>{setSelected(selected===e.id?null:e.id);setAdding(false);setAdvanced(false)}}><span className="owner-avatar"><FiUser/></span><span className="owner-person-name"><strong>{e.name}</strong><small>{e.role}</small></span><span className={'owner-state '+(e.active?'active':'')}>{e.active?'Active':'Inactive'}</span><FiEdit2/></button>)}</div>
  {picked&&<div className="mgmt-card owner-profile">
   <div className="mgmt-section-title"><h2>{picked.name}</h2><span className={'owner-state '+(picked.active?'active':'')}>{picked.active?'Active':'Inactive'}</span></div>
   <p className="mgmt-sub">{picked.role} · {picked.contact||'No contact information entered'}</p>
   <div className="mgmt-stats"><div className="mgmt-stat"><div className="mgmt-stat-top"><span>Assigned Orders</span><FiBriefcase/></div><strong>{assigned.length}</strong></div><div className="mgmt-stat"><div className="mgmt-stat-top"><span>Finished / Ready</span><FiCheckCircle/></div><strong>{finished}</strong></div></div>
   <div className="mgmt-section-title"><h2><FiClock/> Attendance & Hours</h2></div><p className="mgmt-sub">No verified attendance records yet. Days present, absences, total working hours, and shifts will appear once Time In / Time Out is connected. Online status is not attendance.</p>
   <div className="mgmt-section-title"><h2><FiActivity/> Task Performance</h2></div><p className="mgmt-sub">{assigned.length} sample assigned order(s); {finished} ready/completed. Refill and delivery productivity will be measured by actual task records, not login status.</p>
   <div className="owner-actions"><button className="mgmt-btn secondary" onClick={()=>update(picked.id,'active',!picked.active)}>{picked.active?'Deactivate Account':'Reactivate Account'}</button><button className="mgmt-btn secondary" onClick={()=>setAdvanced(!advanced)}>{advanced?'Hide':'Edit'} Role & Permissions</button></div>
   {advanced&&<div className="mgmt-formgrid" style={{marginTop:12}}><div className="mgmt-field"><label>Role</label><select value={picked.role} onChange={e=>update(picked.id,'role',e.target.value)}><option>Manager</option><option>Staff / Refiller</option><option>Delivery</option></select></div><div className="mgmt-field"><label>POS Access</label><select value={picked.pos?'yes':'no'} onChange={e=>update(picked.id,'pos',e.target.value==='yes')}><option value="no">No</option><option value="yes">Yes</option></select></div></div>}
   <p className="mgmt-demo">All employee accounts, role edits and performance values are local sample data; not real authorization or attendance.</p>
  </div>}
 </>;
}
