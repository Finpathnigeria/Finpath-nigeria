import { useState, useRef, useEffect } from "react";

const C = {
  forest:"#0B3D2E", jade:"#1A6B4A", mint:"#2ECC8A", gold:"#D4A017",
  amber:"#F0B429", cream:"#FDFAF3", mist:"#E8F4F0", rose:"#E74C3C",
  sky:"#2980B9", lilac:"#7C5CBF", text:"#2C3E50", sub:"#6B7C6E",
};
const fmt = (n) => "₦" + Number(n||0).toLocaleString("en-NG",{minimumFractionDigits:0,maximumFractionDigits:0});
const fmtK = (n) => n>=1000000?`₦${(n/1000000).toFixed(1)}M`:n>=1000?`₦${(n/1000).toFixed(0)}k`:fmt(n);

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function Card({children,style={},onClick}){return <div onClick={onClick} style={{background:"white",borderRadius:14,padding:18,border:"1px solid #E0EAE4",boxShadow:"0 2px 8px rgba(0,0,0,0.04)",cursor:onClick?"pointer":"auto",...style}}>{children}</div>;}
function SHdr({title,sub}){return <div style={{marginBottom:18}}><h2 style={{fontSize:20,fontWeight:800,color:C.forest,margin:0}}>{title}</h2>{sub&&<p style={{fontSize:12,color:C.sub,margin:"4px 0 0"}}>{sub}</p>}</div>;}
function SubNav({tabs,active,set}){return <div style={{display:"flex",gap:6,marginBottom:20,overflowX:"auto",paddingBottom:4}}>{tabs.map(t=><button key={t} onClick={()=>set(t)} style={{padding:"7px 14px",borderRadius:20,border:"none",background:active===t?C.forest:"#F0F4F2",color:active===t?"white":C.text,fontWeight:600,fontSize:11,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{t}</button>)}</div>;}
function FInput({label,value,onChange,placeholder,type="text",error,disabled=false}){return <div style={{marginBottom:12}}>{label&&<label style={{fontSize:11,color:C.sub,fontWeight:700,display:"block",marginBottom:5}}>{label}</label>}<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${error?C.rose:disabled?"#E8E8E8":"#E0EAE4"}`,fontSize:14,color:disabled?C.sub:C.text,outline:"none",background:disabled?"#F8F8F8":"white",cursor:disabled?"not-allowed":"text"}}/>{error&&<div style={{fontSize:11,color:C.rose,marginTop:4}}>{error}</div>}</div>;}
function RiskBadge({level}){const m={zero:["#27AE60","Zero","🛡️"],mid:[C.amber,"Mid","⚖️"],high:[C.rose,"High","🚀"]};const[col,lbl,ico]=m[level]||m.zero;return <span style={{background:col+"22",color:col,border:`1px solid ${col}55`,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700}}>{ico} {lbl}</span>;}

// ─── AUTH STORE ───────────────────────────────────────────────────────────────
const TRIAL_DAYS = 30;
const AUTH = {
  getUsers:()=>{try{return JSON.parse(localStorage.getItem("fp_users")||"[]");}catch{return[];}},
  saveUsers:(u)=>localStorage.setItem("fp_users",JSON.stringify(u)),
  getSession:()=>{try{return JSON.parse(localStorage.getItem("fp_session")||"null");}catch{return null;}},
  saveSession:(u)=>localStorage.setItem("fp_session",JSON.stringify(u)),
  clearSession:()=>localStorage.removeItem("fp_session"),
  getNameRequests:()=>{try{return JSON.parse(localStorage.getItem("fp_name_requests")||"[]");}catch{return[];}},
  saveNameRequests:(r)=>localStorage.setItem("fp_name_requests",JSON.stringify(r)),
  getTrialDaysLeft:(user)=>{if(!user?.trialStart)return 0;const e=Math.floor((Date.now()-user.trialStart)/(1000*60*60*24));return Math.max(0,TRIAL_DAYS-e);},
  isTrialActive:(user)=>AUTH.getTrialDaysLeft(user)>0,
  signup:(data)=>{
    const users=AUTH.getUsers();
    if(users.find(u=>u.email===data.email))return{ok:false,error:"Email already registered."};
    const user={...data,id:Date.now(),plan:"trial",trialStart:Date.now(),joinedAt:new Date().toISOString(),avatar:data.name.charAt(0).toUpperCase(),avatarImg:null,tutorialSeen:false,notifDismissed:false};
    AUTH.saveUsers([...users,user]);AUTH.saveSession(user);return{ok:true,user};
  },
  login:(email,password)=>{
    const users=AUTH.getUsers();const user=users.find(u=>u.email===email&&u.password===password);
    if(!user)return{ok:false,error:"Incorrect email or password."};
    AUTH.saveSession(user);return{ok:true,user};
  },
  updateUser:(updated)=>{
    const users=AUTH.getUsers().map(u=>u.id===updated.id?updated:u);
    AUTH.saveUsers(users);AUTH.saveSession(updated);return updated;
  },
  submitNameRequest:(userId,currentName,requestedName)=>{
    const requests=AUTH.getNameRequests();
    const existing=requests.find(r=>r.userId===userId&&r.status==="pending");
    if(existing)return{ok:false,error:"You already have a pending name change request."};
    const req={id:Date.now(),userId,currentName,requestedName,submittedAt:new Date().toISOString(),status:"pending"};
    AUTH.saveNameRequests([...requests,req]);return{ok:true,req};
  },
  approveNameRequest:(reqId,adminUser)=>{
    const requests=AUTH.getNameRequests();
    const req=requests.find(r=>r.id===reqId);
    if(!req)return{ok:false,error:"Request not found."};
    const updated=requests.map(r=>r.id===reqId?{...r,status:"approved",reviewedAt:new Date().toISOString(),reviewedBy:adminUser.name}:r);
    AUTH.saveNameRequests(updated);
    const users=AUTH.getUsers().map(u=>u.id===req.userId?{...u,name:req.requestedName,avatar:req.requestedName.charAt(0).toUpperCase()}:u);
    AUTH.saveUsers(users);return{ok:true};
  },
  rejectNameRequest:(reqId,adminUser,reason)=>{
    const requests=AUTH.getNameRequests();
    const updated=requests.map(r=>r.id===reqId?{...r,status:"rejected",reviewedAt:new Date().toISOString(),reviewedBy:adminUser.name,rejectionReason:reason}:r);
    AUTH.saveNameRequests(updated);return{ok:true};
  },
  isAdmin:(user)=>user?.isAdmin===true,
};

// ─── AVATAR COMPONENT ─────────────────────────────────────────────────────────
function Avatar({user,size=40,fontSize=16}){
  if(user?.avatarImg){
    return <div style={{width:size,height:size,borderRadius:"50%",overflow:"hidden",flexShrink:0}}><img src={user.avatarImg} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>;
  }
  return <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${C.jade},${C.forest})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize,fontWeight:800,color:"white",flexShrink:0}}>{user?.avatar||"?"}</div>;
}

// ─── TRIAL BANNER ─────────────────────────────────────────────────────────────
function TrialBanner({user,onUpgrade}){
  const daysLeft=AUTH.getTrialDaysLeft(user);
  const isActive=daysLeft>0;
  const urgency=daysLeft<=5?"high":daysLeft<=10?"medium":"low";
  const bg=urgency==="high"?`linear-gradient(135deg,${C.rose},#c0392b)`:urgency==="medium"?`linear-gradient(135deg,${C.amber},${C.gold})`:`linear-gradient(135deg,${C.jade},${C.forest})`;
  if(!isActive)return(
    <div style={{background:`linear-gradient(135deg,${C.rose},#c0392b)`,borderRadius:14,padding:16,marginBottom:16}}>
      <div style={{fontWeight:800,color:"white",fontSize:14,marginBottom:4}}>⏰ Your Free Trial Has Ended</div>
      <div style={{fontSize:12,color:"rgba(255,255,255,0.85)",lineHeight:1.6,marginBottom:12}}>Upgrade to Pro to continue accessing all investments, AI Advisor, and financial tools.</div>
      <button onClick={onUpgrade} style={{background:"white",border:"none",borderRadius:9,padding:"10px 20px",color:C.rose,fontWeight:800,cursor:"pointer",fontSize:12}}>Upgrade to Pro — ₦2,500/mo →</button>
    </div>
  );
  const pct=((TRIAL_DAYS-daysLeft)/TRIAL_DAYS)*100;
  return(
    <div style={{background:bg,borderRadius:14,padding:16,marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div><div style={{fontWeight:800,color:"white",fontSize:14,marginBottom:2}}>{urgency==="high"?`🚨 Only ${daysLeft} days left!`:urgency==="medium"?`⏳ ${daysLeft} days remaining`:` 🎉 Free Premium — ${daysLeft} days left`}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.8)"}}>Full Pro access active · All features unlocked</div></div>
        <div style={{textAlign:"right"}}><div style={{fontSize:24,fontWeight:800,color:"white"}}>{daysLeft}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.7)"}}>days left</div></div>
      </div>
      <div style={{background:"rgba(255,255,255,0.2)",borderRadius:6,height:6,overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:`${pct}%`,background:"rgba(255,255,255,0.9)",borderRadius:6}}/></div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>Day {TRIAL_DAYS-daysLeft} of {TRIAL_DAYS}</div>
        <button onClick={onUpgrade} style={{background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.4)",borderRadius:8,padding:"7px 14px",color:"white",fontWeight:700,cursor:"pointer",fontSize:10}}>Lock in Pro →</button>
      </div>
    </div>
  );
}

// ─── PROFILE SECTION ──────────────────────────────────────────────────────────
function ProfileSection({user,onUserUpdate,onLogout}){
  const [sub,setSub]=useState("My Profile");
  const nameRequests=AUTH.getNameRequests().filter(r=>r.userId===user.id);
  const pendingNameReq=nameRequests.find(r=>r.status==="pending");
  const lastNameReq=nameRequests.sort((a,b)=>b.id-a.id)[0];

  return(
    <div>
      <SubNav tabs={["My Profile","Edit Details","Change Avatar","Name Change"]} active={sub} set={setSub}/>
      {sub==="My Profile"&&<ProfileView user={user} onLogout={onLogout} pendingNameReq={pendingNameReq} lastNameReq={lastNameReq}/>}
      {sub==="Edit Details"&&<EditDetails user={user} onUserUpdate={onUserUpdate}/>}
      {sub==="Change Avatar"&&<ChangeAvatar user={user} onUserUpdate={onUserUpdate}/>}
      {sub==="Name Change"&&<NameChangeRequest user={user} pendingNameReq={pendingNameReq} lastNameReq={lastNameReq} onUserUpdate={onUserUpdate}/>}
    </div>
  );
}

function ProfileView({user,onLogout,pendingNameReq,lastNameReq}){
  const daysLeft=AUTH.getTrialDaysLeft(user);
  const fields=[
    ["Full Name",user.name],["Email",user.email],["Phone",user.phone||"Not set"],
    ["Grade Level",user.gradeLevel||"Not set"],["Ministry / Agency",user.ministry||"Not set"],
    ["State",user.state||"Not set"],["Plan",user.plan==="trial"?`Free Trial (${daysLeft} days left)`:"Pro"],
    ["Member Since",new Date(user.joinedAt).toLocaleDateString("en-NG",{day:"numeric",month:"long",year:"numeric"})],
  ];
  return(
    <div>
      {/* Profile hero */}
      <Card style={{marginBottom:16,background:`linear-gradient(135deg,${C.forest},${C.jade})`,border:"none"}}>
        <div style={{display:"flex",gap:16,alignItems:"center"}}>
          <div style={{position:"relative"}}>
            <Avatar user={user} size={72} fontSize={28}/>
            <div style={{position:"absolute",bottom:0,right:0,width:22,height:22,background:C.amber,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,border:"2px solid white"}}>✎</div>
          </div>
          <div>
            <div style={{fontWeight:800,color:"white",fontSize:18,fontFamily:"'Playfair Display',serif"}}>{user.name}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginTop:3}}>{user.gradeLevel||"Civil Servant"} · {user.state||"Nigeria"}</div>
            <div style={{fontSize:11,color:C.mint,marginTop:4,fontWeight:600}}>{user.plan==="trial"?"🎁 Free Trial Active":"⭐ Pro Member"}</div>
          </div>
        </div>
        {pendingNameReq&&(
          <div style={{marginTop:14,background:"rgba(255,255,255,0.15)",borderRadius:9,padding:"10px 12px",display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:14}}>⏳</span>
            <div style={{fontSize:12,color:"white"}}>Name change request to "<b>{pendingNameReq.requestedName}</b>" is pending admin review.</div>
          </div>
        )}
      </Card>
      {/* Details */}
      <Card style={{marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.forest,marginBottom:14}}>Account Details</div>
        {fields.map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",paddingBottom:10,marginBottom:10,borderBottom:"1px solid #F4F4F4"}}>
            <span style={{fontSize:12,color:C.sub,fontWeight:600}}>{l}</span>
            <span style={{fontSize:12,color:C.text,fontWeight:500,maxWidth:"55%",textAlign:"right"}}>{v}</span>
          </div>
        ))}
      </Card>
      {lastNameReq&&lastNameReq.status!=="pending"&&(
        <Card style={{marginBottom:16,border:`2px solid ${lastNameReq.status==="approved"?C.jade:C.rose}`}}>
          <div style={{fontWeight:700,color:lastNameReq.status==="approved"?C.jade:C.rose,fontSize:13,marginBottom:4}}>
            {lastNameReq.status==="approved"?"✓ Name Change Approved":"✕ Name Change Rejected"}
          </div>
          <div style={{fontSize:12,color:C.sub,lineHeight:1.5}}>
            {lastNameReq.status==="approved"?`Your name was updated to "${lastNameReq.requestedName}" by admin.`:
            `Your request to change to "${lastNameReq.requestedName}" was rejected.${lastNameReq.rejectionReason?` Reason: ${lastNameReq.rejectionReason}`:""}`}
          </div>
        </Card>
      )}
      <button onClick={onLogout} style={{width:"100%",background:"none",border:"1.5px solid #E0EAE4",borderRadius:12,padding:"12px 0",color:C.sub,fontWeight:600,cursor:"pointer",fontSize:13}}>Log Out</button>
    </div>
  );
}

function EditDetails({user,onUserUpdate}){
  const [phone,setPhone]=useState(user.phone||"");
  const [gradeLevel,setGradeLevel]=useState(user.gradeLevel||"");
  const [ministry,setMinistry]=useState(user.ministry||"");
  const [state,setState]=useState(user.state||"");
  const [email,setEmail]=useState(user.email||"");
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [errors,setErrors]=useState({});

  const gradeLevels=["GL 04","GL 05","GL 06","GL 07","GL 08","GL 09","GL 10","GL 12","GL 13","GL 14","GL 15","GL 16","GL 17","Director","Permanent Secretary"];
  const states=["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];

  const validate=()=>{
    const e={};
    if(!email.includes("@"))e.email="Enter a valid email address.";
    setErrors(e);return!Object.keys(e).length;
  };

  const save=()=>{
    if(!validate())return;
    setSaving(true);
    setTimeout(()=>{
      const updated=AUTH.updateUser({...user,phone,gradeLevel,ministry,state,email});
      onUserUpdate(updated);setSaving(false);setSaved(true);
      setTimeout(()=>setSaved(false),3000);
    },700);
  };

  const selStyle=(val)=>({width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #E0EAE4",fontSize:14,color:val?C.text:C.sub,outline:"none",background:"white",appearance:"none",cursor:"pointer"});

  return(
    <div>
      <SHdr title="Edit Profile Details" sub="Update your contact and work information"/>
      <Card style={{marginBottom:14,background:C.mist,border:`1px solid ${C.jade}33`}}>
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:20}}>ℹ️</span>
          <div style={{fontSize:12,color:C.forest,lineHeight:1.6}}>
            <b>Note:</b> To change your name, use the <b>Name Change</b> tab — it requires admin approval. All other details below can be updated freely.
          </div>
        </div>
      </Card>
      <Card>
        <FInput label="FULL NAME (read-only — use Name Change tab)" value={user.name} onChange={()=>{}} disabled={true}/>
        <FInput label="EMAIL ADDRESS" value={email} onChange={setEmail} placeholder="you@email.com" type="email" error={errors.email}/>
        <FInput label="PHONE NUMBER" value={phone} onChange={setPhone} placeholder="e.g. 08012345678" type="tel"/>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:11,color:C.sub,fontWeight:700,display:"block",marginBottom:5}}>GRADE LEVEL</label>
          <select value={gradeLevel} onChange={e=>setGradeLevel(e.target.value)} style={selStyle(gradeLevel)}>
            <option value="">Select grade level</option>
            {gradeLevels.map(g=><option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <FInput label="MINISTRY / AGENCY / DEPARTMENT" value={ministry} onChange={setMinistry} placeholder="e.g. Federal Ministry of Finance"/>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:11,color:C.sub,fontWeight:700,display:"block",marginBottom:5}}>STATE OF POSTING</label>
          <select value={state} onChange={e=>setState(e.target.value)} style={selStyle(state)}>
            <option value="">Select state</option>
            {states.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {saved&&(
          <div style={{background:"#E8F8EE",border:`1px solid ${C.jade}`,borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:16}}>✅</span>
            <span style={{fontSize:13,color:C.jade,fontWeight:700}}>Profile updated successfully!</span>
          </div>
        )}
        <button onClick={save} disabled={saving} style={{width:"100%",background:saving?"#9ABFAA":C.forest,border:"none",borderRadius:12,padding:"13px 0",color:"white",fontWeight:800,cursor:"pointer",fontSize:14,transition:"background 0.2s"}}>
          {saving?"Saving...":"Save Changes ✓"}
        </button>
      </Card>
    </div>
  );
}

function ChangeAvatar({user,onUserUpdate}){
  const fileRef=useRef(null);
  const [preview,setPreview]=useState(user.avatarImg||null);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [removing,setRemoving]=useState(false);
  const AVATAR_COLORS=[
    {bg:"#0B3D2E",label:"Forest Green"},
    {bg:"#1A6B4A",label:"Jade"},
    {bg:"#2980B9",label:"Ocean Blue"},
    {bg:"#7C5CBF",label:"Royal Purple"},
    {bg:"#E74C3C",label:"Crimson"},
    {bg:"#D4A017",label:"Gold"},
    {bg:"#2ECC8A",label:"Mint"},
    {bg:"#E67E22",label:"Ember"},
  ];
  const [selectedColor,setSelectedColor]=useState(user.avatarColor||"#0B3D2E");

  const handleFile=(e)=>{
    const file=e.target.files[0];
    if(!file)return;
    if(file.size>2*1024*1024){alert("Image must be under 2MB. Please choose a smaller image.");return;}
    const reader=new FileReader();
    reader.onload=(ev)=>setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const save=()=>{
    setSaving(true);
    setTimeout(()=>{
      const updated=AUTH.updateUser({...user,avatarImg:preview,avatarColor:selectedColor,avatar:user.name.charAt(0).toUpperCase()});
      onUserUpdate(updated);setSaving(false);setSaved(true);
      setTimeout(()=>setSaved(false),3000);
    },800);
  };

  const removePhoto=()=>{
    setRemoving(true);
    setTimeout(()=>{
      setPreview(null);
      const updated=AUTH.updateUser({...user,avatarImg:null});
      onUserUpdate(updated);setRemoving(false);
    },500);
  };

  return(
    <div>
      <SHdr title="Profile Picture" sub="Upload a photo or choose your avatar colour"/>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 0"}}>
          {/* Avatar preview */}
          <div style={{position:"relative",marginBottom:20}}>
            {preview?(
              <div style={{width:100,height:100,borderRadius:"50%",overflow:"hidden",border:`3px solid ${C.jade}`,boxShadow:"0 4px 16px rgba(0,0,0,0.15)"}}>
                <img src={preview} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              </div>
            ):(
              <div style={{width:100,height:100,borderRadius:"50%",background:`linear-gradient(135deg,${selectedColor},${selectedColor}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,fontWeight:800,color:"white",border:`3px solid ${C.jade}`,boxShadow:"0 4px 16px rgba(0,0,0,0.12)"}}>
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button onClick={()=>fileRef.current?.click()} style={{position:"absolute",bottom:2,right:2,width:30,height:30,background:C.amber,border:"2px solid white",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13}}>📷</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
          {/* Upload buttons */}
          <div style={{display:"flex",gap:10,marginBottom:8}}>
            <button onClick={()=>fileRef.current?.click()} style={{background:C.jade,color:"white",border:"none",borderRadius:10,padding:"10px 20px",fontWeight:700,cursor:"pointer",fontSize:12}}>
              📷 {preview?"Change Photo":"Upload Photo"}
            </button>
            {(preview||user.avatarImg)&&(
              <button onClick={removePhoto} style={{background:"#FEE",color:C.rose,border:`1px solid ${C.rose}44`,borderRadius:10,padding:"10px 16px",fontWeight:700,cursor:"pointer",fontSize:12}}>
                {removing?"Removing...":"🗑️ Remove"}
              </button>
            )}
          </div>
          <div style={{fontSize:11,color:C.sub,textAlign:"center",lineHeight:1.5,marginBottom:4}}>JPG, PNG or GIF · Max 2MB</div>
          <div style={{fontSize:10,color:C.sub}}>Tap the camera icon on your avatar to upload</div>
        </div>
      </Card>

      {/* Colour picker */}
      {!preview&&(
        <Card style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:C.forest,marginBottom:14}}>Choose Avatar Colour</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            {AVATAR_COLORS.map(c=>(
              <div key={c.bg} onClick={()=>setSelectedColor(c.bg)} style={{cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                <div style={{width:52,height:52,borderRadius:"50%",background:c.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"white",border:selectedColor===c.bg?`3px solid ${C.amber}`:"3px solid transparent",boxShadow:selectedColor===c.bg?"0 0 0 2px rgba(240,180,41,0.4)":"none",transition:"all 0.2s"}}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div style={{fontSize:9,color:C.sub,textAlign:"center",fontWeight:selectedColor===c.bg?700:400}}>{c.label}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {saved&&(
        <div style={{background:"#E8F8EE",border:`1px solid ${C.jade}`,borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:16}}>✅</span>
          <span style={{fontSize:13,color:C.jade,fontWeight:700}}>Profile picture updated successfully!</span>
        </div>
      )}
      <button onClick={save} disabled={saving} style={{width:"100%",background:saving?"#9ABFAA":C.forest,border:"none",borderRadius:12,padding:"13px 0",color:"white",fontWeight:800,cursor:"pointer",fontSize:14}}>
        {saving?"Saving...":"Save Profile Picture ✓"}
      </button>
    </div>
  );
}

function NameChangeRequest({user,pendingNameReq,lastNameReq,onUserUpdate}){
  const [newName,setNewName]=useState("");
  const [reason,setReason]=useState("");
  const [submitted,setSubmitted]=useState(false);
  const [error,setError]=useState("");

  const submit=()=>{
    if(newName.trim().length<3){setError("Please enter a valid full name (at least 3 characters).");return;}
    if(newName.trim()===user.name){setError("The new name must be different from your current name.");return;}
    if(!reason.trim()){setError("Please provide a reason for the name change request.");return;}
    const result=AUTH.submitNameRequest(user.id,user.name,newName.trim());
    if(!result.ok){setError(result.error);return;}
    setSubmitted(true);setError("");
  };

  return(
    <div>
      <SHdr title="Name Change Request" sub="Requires admin approval to protect account security"/>
      <Card style={{marginBottom:14,background:"#FFF8EE",border:`2px solid ${C.amber}55`}}>
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:22}}>🔐</span>
          <div>
            <div style={{fontWeight:700,color:C.forest,fontSize:13,marginBottom:4}}>Why does name change need admin approval?</div>
            <div style={{fontSize:12,color:C.text,lineHeight:1.7}}>
              Your name is tied to your civil service records, pension details, and NHF account. Unauthorised name changes could create legal and financial complications. All requests are reviewed within <b>24–48 hours</b> by our admin team.
            </div>
          </div>
        </div>
      </Card>

      {pendingNameReq?(
        <Card style={{border:`2px solid ${C.amber}`}}>
          <div style={{fontWeight:700,color:C.amber,fontSize:14,marginBottom:8}}>⏳ Request Pending Review</div>
          <div style={{fontSize:12,color:C.sub,marginBottom:12,lineHeight:1.6}}>
            Your name change request is currently under admin review. You will be notified once a decision is made.
          </div>
          <div style={{background:C.mist,borderRadius:10,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:12,color:C.sub}}>Current Name</span>
              <span style={{fontSize:12,fontWeight:700,color:C.text}}>{pendingNameReq.currentName}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:12,color:C.sub}}>Requested Name</span>
              <span style={{fontSize:12,fontWeight:700,color:C.jade}}>{pendingNameReq.requestedName}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:12,color:C.sub}}>Submitted</span>
              <span style={{fontSize:12,color:C.text}}>{new Date(pendingNameReq.submittedAt).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"})}</span>
            </div>
          </div>
          <div style={{marginTop:12,background:C.amber+"22",borderRadius:9,padding:"10px 12px",fontSize:12,color:C.text}}>
            ⏱️ Expected review time: <b>24–48 hours</b>. Check back soon or wait for a notification.
          </div>
        </Card>
      ):submitted?(
        <Card style={{border:`2px solid ${C.jade}`}}>
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <div style={{fontWeight:800,color:C.forest,fontSize:16,marginBottom:8}}>Request Submitted!</div>
            <div style={{fontSize:13,color:C.sub,lineHeight:1.7}}>Your name change request has been sent to the admin team. You will receive a notification within 24–48 hours once it is reviewed.</div>
          </div>
        </Card>
      ):(
        <Card>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:C.sub,marginBottom:6}}>Current Name</div>
            <div style={{background:"#F4F4F4",borderRadius:10,padding:"10px 14px",fontSize:14,fontWeight:700,color:C.sub}}>{user.name}</div>
          </div>
          <FInput label="REQUESTED NEW NAME" value={newName} onChange={(v)=>{setNewName(v);setError("");}} placeholder="Enter your full correct name"/>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:C.sub,fontWeight:700,display:"block",marginBottom:5}}>REASON FOR NAME CHANGE</label>
            <textarea value={reason} onChange={e=>{setReason(e.target.value);setError("");}} placeholder="e.g. Correction of spelling error, legal name change after marriage, official document mismatch..." style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #E0EAE4",fontSize:13,color:C.text,outline:"none",resize:"none",height:90,lineHeight:1.6,fontFamily:"'DM Sans',sans-serif"}}/>
          </div>
          {error&&<div style={{background:"#FEE",borderRadius:9,padding:"10px 12px",marginBottom:12,fontSize:12,color:C.rose,fontWeight:600}}>{error}</div>}
          <button onClick={submit} style={{width:"100%",background:C.forest,border:"none",borderRadius:12,padding:"13px 0",color:"white",fontWeight:800,cursor:"pointer",fontSize:14}}>Submit Name Change Request →</button>
        </Card>
      )}

      {lastNameReq&&lastNameReq.status!=="pending"&&!submitted&&(
        <Card style={{marginTop:14,border:`2px solid ${lastNameReq.status==="approved"?C.jade:C.rose}`}}>
          <div style={{fontWeight:700,color:lastNameReq.status==="approved"?C.jade:C.rose,fontSize:13,marginBottom:6}}>
            {lastNameReq.status==="approved"?"✓ Previous Request: Approved":"✕ Previous Request: Rejected"}
          </div>
          <div style={{fontSize:12,color:C.sub,lineHeight:1.5}}>
            {lastNameReq.status==="approved"?`Your name was successfully changed to "${lastNameReq.requestedName}".`:`Request to change to "${lastNameReq.requestedName}" was rejected.${lastNameReq.rejectionReason?` Admin note: "${lastNameReq.rejectionReason}"`:""}`}
          </div>
          {lastNameReq.reviewedAt&&<div style={{fontSize:11,color:C.sub,marginTop:6}}>Reviewed: {new Date(lastNameReq.reviewedAt).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"})}</div>}
        </Card>
      )}
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({adminUser}){
  const [sub,setSub]=useState("Name Requests");
  const [requests,setRequests]=useState(()=>AUTH.getNameRequests());
  const [rejectModal,setRejectModal]=useState(null);
  const [rejectReason,setRejectReason]=useState("");
  const [users,setUsers]=useState(()=>AUTH.getUsers());

  const refresh=()=>{setRequests(AUTH.getNameRequests());setUsers(AUTH.getUsers());};

  const approve=(req)=>{
    AUTH.approveNameRequest(req.id,adminUser);
    refresh();
  };
  const reject=(req)=>{
    if(!rejectReason.trim()){alert("Please enter a rejection reason.");return;}
    AUTH.rejectNameRequest(req.id,adminUser,rejectReason);
    setRejectModal(null);setRejectReason("");refresh();
  };

  const pending=requests.filter(r=>r.status==="pending");
  const reviewed=requests.filter(r=>r.status!=="pending");

  const statusColor={pending:C.amber,approved:C.jade,rejected:C.rose};
  const statusIcon={pending:"⏳",approved:"✅",rejected:"❌"};

  return(
    <div>
      <Card style={{background:`linear-gradient(135deg,${C.forest},${C.jade})`,marginBottom:16,border:"none"}}>
        <div style={{fontWeight:800,color:"white",fontSize:16,marginBottom:4}}>🛡️ Admin Panel</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.7)"}}>Manage name change requests and user accounts</div>
        <div style={{display:"flex",gap:12,marginTop:12}}>
          {[["Pending",pending.length,C.amber],["Total Users",users.length,"white"],["Reviewed",reviewed.length,C.mint]].map(([l,v,c])=>(
            <div key={l} style={{background:"rgba(255,255,255,0.12)",borderRadius:9,padding:"8px 14px",flex:1,textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>{l}</div>
            </div>
          ))}
        </div>
      </Card>

      <SubNav tabs={["Name Requests","All Users"]} active={sub} set={setSub}/>

      {sub==="Name Requests"&&(
        <div>
          {pending.length===0&&reviewed.length===0&&(
            <div style={{textAlign:"center",padding:40,color:C.sub,fontSize:14}}>No name change requests yet.</div>
          )}
          {pending.length>0&&(
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.amber,marginBottom:12}}>⏳ Pending Review ({pending.length})</div>
              {pending.map(req=>{
                const reqUser=users.find(u=>u.id===req.userId);
                return(
                  <Card key={req.id} style={{marginBottom:12,border:`2px solid ${C.amber}55`}}>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:12}}>
                      <Avatar user={reqUser} size={40} fontSize={16}/>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,color:C.forest,fontSize:13}}>{req.currentName}</div>
                        <div style={{fontSize:11,color:C.sub}}>{reqUser?.email} · {reqUser?.gradeLevel||"Unknown GL"}</div>
                      </div>
                      <span style={{background:C.amber+"22",color:C.amber,borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700}}>PENDING</span>
                    </div>
                    <div style={{background:C.mist,borderRadius:10,padding:12,marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:10,color:C.sub,fontWeight:700}}>CURRENT NAME</div>
                          <div style={{fontSize:14,fontWeight:700,color:C.rose}}>{req.currentName}</div>
                        </div>
                        <div style={{fontSize:20}}>→</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:10,color:C.sub,fontWeight:700}}>REQUESTED NAME</div>
                          <div style={{fontSize:14,fontWeight:700,color:C.jade}}>{req.requestedName}</div>
                        </div>
                      </div>
                      <div style={{fontSize:11,color:C.sub}}>Submitted: {new Date(req.submittedAt).toLocaleDateString("en-NG",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                    </div>
                    <div style={{display:"flex",gap:10}}>
                      <button onClick={()=>approve(req)} style={{flex:1,background:C.jade,color:"white",border:"none",borderRadius:10,padding:"11px 0",fontWeight:700,cursor:"pointer",fontSize:13}}>✓ Approve</button>
                      <button onClick={()=>{setRejectModal(req);setRejectReason("");}} style={{flex:1,background:C.rose,color:"white",border:"none",borderRadius:10,padding:"11px 0",fontWeight:700,cursor:"pointer",fontSize:13}}>✕ Reject</button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          {reviewed.length>0&&(
            <div style={{marginTop:20}}>
              <div style={{fontSize:13,fontWeight:700,color:C.sub,marginBottom:12}}>Recent Decisions ({reviewed.length})</div>
              {reviewed.slice(0,5).map(req=>{
                const reqUser=users.find(u=>u.id===req.userId);
                return(
                  <Card key={req.id} style={{marginBottom:10,padding:14,border:`1px solid ${statusColor[req.status]}33`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontWeight:700,color:C.forest,fontSize:12}}>{req.currentName} → {req.requestedName}</div>
                        <div style={{fontSize:11,color:C.sub,marginTop:2}}>{reqUser?.email}</div>
                        {req.rejectionReason&&<div style={{fontSize:11,color:C.rose,marginTop:3}}>Note: {req.rejectionReason}</div>}
                      </div>
                      <span style={{background:statusColor[req.status]+"22",color:statusColor[req.status],borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700}}>{statusIcon[req.status]} {req.status.toUpperCase()}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {sub==="All Users"&&(
        <div>
          <div style={{fontSize:13,fontWeight:700,color:C.forest,marginBottom:12}}>All Registered Users ({users.length})</div>
          {users.length===0&&<div style={{textAlign:"center",padding:40,color:C.sub}}>No users registered yet.</div>}
          {users.map((u,i)=>(
            <Card key={u.id} style={{marginBottom:10,padding:14}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <Avatar user={u} size={40} fontSize={16}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:C.forest,fontSize:13}}>{u.name}</div>
                  <div style={{fontSize:11,color:C.sub,marginTop:2}}>{u.email} · {u.gradeLevel||"—"} · {u.state||"—"}</div>
                  <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap"}}>
                    <span style={{background:C.jade+"22",color:C.jade,borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700}}>{u.plan==="trial"?"TRIAL":"PRO"}</span>
                    {u.isAdmin&&<span style={{background:C.amber+"22",color:C.amber,borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700}}>ADMIN</span>}
                    <span style={{background:C.sky+"18",color:C.sky,borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700}}>Joined {new Date(u.joinedAt).toLocaleDateString("en-NG",{month:"short",year:"numeric"})}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal&&(
        <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:560,height:"100vh",background:"rgba(0,0,0,0.6)",zIndex:300,display:"flex",alignItems:"flex-end"}}>
          <div style={{background:"white",borderRadius:"20px 20px 0 0",padding:24,width:"100%"}}>
            <div style={{fontWeight:800,color:C.forest,fontSize:16,marginBottom:4}}>Reject Name Change</div>
            <div style={{fontSize:12,color:C.sub,marginBottom:14}}>Rejecting "<b>{rejectModal.requestedName}</b>" for {rejectModal.currentName}. Please give a reason:</div>
            <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="e.g. Name does not match IPPIS records, insufficient documentation..." style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #E0EAE4",fontSize:13,resize:"none",height:80,outline:"none",lineHeight:1.6,fontFamily:"'DM Sans',sans-serif",marginBottom:14}}/>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setRejectModal(null);setRejectReason("");}} style={{flex:1,background:"#F0F4F2",border:"none",borderRadius:10,padding:"12px 0",color:C.text,fontWeight:700,cursor:"pointer"}}>Cancel</button>
              <button onClick={()=>reject(rejectModal)} style={{flex:1,background:C.rose,border:"none",borderRadius:10,padding:"12px 0",color:"white",fontWeight:800,cursor:"pointer"}}>Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NOTIFICATION BELL ────────────────────────────────────────────────────────
const TUTORIALS=[
  {id:"intro",emoji:"🎬",title:"Welcome to FinPath Nigeria",duration:"3:42",desc:"Platform overview — what it does, who it's for, and how to navigate.",chapter:"Getting Started"},
  {id:"invest",emoji:"📈",title:"How to Use the Investment Hub",duration:"8:15",desc:"Cash Flow vs Long-Term, risk levels, and the return calculator.",chapter:"Investing"},
  {id:"physical",emoji:"🌾",title:"Physical & Agricultural Investments",duration:"10:30",desc:"Poultry, catfish, water business, land, mushrooms and more.",chapter:"Investing"},
  {id:"budget",emoji:"📋",title:"Budget Planner & Savings Goals",duration:"5:20",desc:"Enter salary, set expenses, track savings goals.",chapter:"Planning"},
  {id:"tools",emoji:"🛠️",title:"Financial Tools Deep Dive",duration:"9:45",desc:"PAYE, retirement projector, net worth, inflation, debt planner.",chapter:"Tools"},
  {id:"ai",emoji:"🤖",title:"Getting the Best from the AI Advisor",duration:"6:10",desc:"Smart questions, shortcuts, personalised advice.",chapter:"AI Advisor"},
  {id:"trial",emoji:"🎁",title:"Making the Most of Your 30-Day Trial",duration:"4:00",desc:"Maximise your free premium period.",chapter:"Getting Started"},
];

function TutorialModal({user,onClose,onMarkWatched,watchedIds}){
  const [active,setActive]=useState(null);
  const [filter,setFilter]=useState("All");
  const chapters=["All","Getting Started","Investing","Planning","Tools","AI Advisor"];
  const filtered=filter==="All"?TUTORIALS:TUTORIALS.filter(t=>t.chapter===filter);
  const totalWatched=watchedIds.length;
  return(
    <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:560,height:"100vh",background:C.cream,zIndex:200,display:"flex",flexDirection:"column",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{background:C.forest,padding:"16px 20px",boxShadow:"0 4px 20px rgba(11,61,46,0.3)",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:16,fontWeight:800,color:"white"}}>📹 Tutorial Centre</div><div style={{fontSize:11,color:C.mint,marginTop:2}}>{totalWatched}/{TUTORIALS.length} videos watched</div></div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,padding:"8px 14px",color:"white",cursor:"pointer",fontWeight:700}}>✕ Close</button>
        </div>
        <div style={{background:"rgba(255,255,255,0.2)",borderRadius:6,height:5,overflow:"hidden",marginTop:12}}><div style={{height:"100%",width:`${(totalWatched/TUTORIALS.length)*100}%`,background:C.amber,borderRadius:6}}/></div>
      </div>
      <div style={{padding:"12px 16px 0",flexShrink:0}}><SubNav tabs={chapters} active={filter} set={setFilter}/></div>
      <div style={{flex:1,overflowY:"auto",padding:"0 16px 20px"}}>
        {filtered.map(t=>{
          const isWatched=watchedIds.includes(t.id);
          const isOpen=active===t.id;
          return(
            <div key={t.id} style={{marginBottom:12}}>
              <div onClick={()=>setActive(isOpen?null:t.id)} style={{background:"white",borderRadius:14,padding:16,cursor:"pointer",border:`2px solid ${isOpen?C.jade:isWatched?C.mint+"88":"#E0EAE4"}`,transition:"all 0.2s",position:"relative"}}>
                {isWatched&&<div style={{position:"absolute",top:10,right:10,background:C.jade,borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700,color:"white"}}>✓ WATCHED</div>}
                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{width:72,height:54,borderRadius:10,background:`linear-gradient(135deg,${C.forest},${C.jade})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative"}}>
                    <span style={{fontSize:22}}>{t.emoji}</span>
                    <div style={{position:"absolute",bottom:4,right:4,background:"rgba(0,0,0,0.6)",borderRadius:4,padding:"1px 5px",fontSize:9,color:"white",fontWeight:600}}>{t.duration}</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:C.jade,fontWeight:700,marginBottom:3,textTransform:"uppercase",letterSpacing:0.5}}>{t.chapter}</div>
                    <div style={{fontWeight:700,color:C.forest,fontSize:13,lineHeight:1.4,marginBottom:4}}>{t.title}</div>
                    <div style={{fontSize:11,color:C.sub,lineHeight:1.5}}>{t.desc}</div>
                  </div>
                </div>
                {isOpen&&(
                  <div style={{marginTop:14,borderTop:"1px solid #F0F4F2",paddingTop:14}}>
                    <div style={{background:`linear-gradient(135deg,${C.forest},#0d4f38)`,borderRadius:12,overflow:"hidden",marginBottom:12,position:"relative"}}>
                      <div style={{paddingTop:"56.25%",position:"relative"}}>
                        <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10}}>
                          <div style={{width:52,height:52,background:"rgba(255,255,255,0.15)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid rgba(255,255,255,0.4)"}}><span style={{fontSize:22,marginLeft:3}}>▶</span></div>
                          <div style={{background:C.amber,borderRadius:20,padding:"6px 18px",fontSize:11,color:C.forest,fontWeight:700}}>▶ Watch on YouTube</div>
                        </div>
                      </div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();onMarkWatched(t.id);}} style={{width:"100%",background:isWatched?"#F0F4F2":C.jade,border:"none",borderRadius:10,padding:"11px 0",color:isWatched?C.sub:"white",fontWeight:700,cursor:"pointer",fontSize:13}}>
                      {isWatched?"✓ Marked as Watched":"✓ Mark as Watched"}
                    </button>
                  </div>
                )}
                <div style={{marginTop:isOpen?0:8,textAlign:"center",fontSize:10,color:C.sub}}>{isOpen?"▲ Close":"▼ Preview & Watch"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NotificationBell({user,watchedIds,onOpenTutorial,trialDaysLeft,nameRequests}){
  const [open,setOpen]=useState(false);
  const pendingNameReq=nameRequests?.find(r=>r.status==="pending");
  const unwatched=TUTORIALS.length-watchedIds.length;
  const notifications=[
    {id:"tutorial",icon:"📹",title:"Tutorial videos available",body:`${unwatched} tutorial${unwatched!==1?"s":""} waiting — learn every FinPath feature.`,action:"Watch Tutorials",color:C.jade,onClick:()=>{setOpen(false);onOpenTutorial();}},
    {id:"trial",icon:"🎁",title:`${trialDaysLeft} days of free Premium left`,body:"Full Pro access active. Explore investments, AI Advisor, and tools.",action:"View Dashboard",color:C.amber,onClick:()=>setOpen(false)},
    ...(pendingNameReq?[{id:"nameReq",icon:"⏳",title:"Name change pending",body:`Your request to change to "${pendingNameReq.requestedName}" is under review.`,action:"View Request",color:C.rose,onClick:()=>setOpen(false)}]:[]),
  ];
  const unread=notifications.length;
  return(
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(!open)} style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:8,padding:"7px 10px",color:"white",cursor:"pointer",position:"relative",fontSize:16}}>
        🔔
        {unread>0&&<div style={{position:"absolute",top:-3,right:-3,width:16,height:16,background:C.rose,borderRadius:"50%",fontSize:9,fontWeight:800,color:"white",display:"flex",alignItems:"center",justifyContent:"center"}}>{unread}</div>}
      </button>
      {open&&(
        <>
          <div onClick={()=>setOpen(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:150}}/>
          <div style={{position:"absolute",right:0,top:"calc(100% + 8px)",width:300,background:"white",borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,0.18)",border:"1px solid #E0EAE4",zIndex:160,overflow:"hidden"}}>
            <div style={{background:C.forest,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:700,color:"white",fontSize:13}}>Notifications</div>
              <div style={{background:C.rose,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:800,color:"white"}}>{unread} new</div>
            </div>
            {notifications.map((n,i)=>(
              <div key={n.id} style={{padding:"12px 14px",borderBottom:i<notifications.length-1?"1px solid #F4F4F4":"none",cursor:"pointer"}} onClick={n.onClick}
                onMouseEnter={e=>e.currentTarget.style.background="#F9F9F9"}
                onMouseLeave={e=>e.currentTarget.style.background="white"}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:34,height:34,background:n.color+"15",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{n.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:C.forest,fontSize:12,marginBottom:3}}>{n.title}</div>
                    <div style={{fontSize:11,color:C.sub,lineHeight:1.5,marginBottom:5}}>{n.body}</div>
                    <div style={{fontSize:11,color:n.color,fontWeight:700}}>{n.action} →</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function UpgradeModal({onClose}){
  return(
    <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:560,height:"100vh",background:"rgba(0,0,0,0.6)",zIndex:300,display:"flex",alignItems:"flex-end",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{background:"white",borderRadius:"20px 20px 0 0",padding:28,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:10}}>🚀</div>
          <h2 style={{fontSize:22,fontWeight:800,color:C.forest,fontFamily:"'Playfair Display',serif",margin:"0 0 8px"}}>Upgrade to FinPath Pro</h2>
          <p style={{fontSize:13,color:C.sub,margin:0}}>Keep full access to every tool and investment guide.</p>
        </div>
        <div style={{background:`linear-gradient(135deg,${C.forest},${C.jade})`,borderRadius:14,padding:20,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div style={{fontWeight:800,color:"white",fontSize:16}}>Pro Plan</div><div style={{fontSize:24,fontWeight:800,color:C.amber}}>₦2,500<span style={{fontSize:12,opacity:0.7}}>/mo</span></div></div>
          {["All 35+ investments + calculators","AI Financial Advisor (unlimited)","Retirement and net worth tools","Full 10-lesson curriculum","Government funding directory"].map((f,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6}}><span style={{color:C.mint,fontSize:12}}>✓</span><span style={{fontSize:12,color:"rgba(255,255,255,0.85)"}}>{f}</span></div>)}
          <button style={{width:"100%",marginTop:14,background:C.amber,border:"none",borderRadius:10,padding:"12px 0",color:C.forest,fontWeight:800,cursor:"pointer",fontSize:13}}>Upgrade Now — Pay with Paystack</button>
        </div>
        <div style={{textAlign:"center"}}><button onClick={onClose} style={{background:"none",border:"none",color:C.sub,cursor:"pointer",fontSize:13,fontWeight:600,textDecoration:"underline"}}>Maybe later</button></div>
      </div>
    </div>
  );
}

// ─── INVEST ───────────────────────────────────────────────────────────────────
const INVEST={
  cashflow:{
    zero:[
      {name:"FGN Treasury Bills",desc:"Federal Govt short-term securities via DMO portal",monthly:1.4,quarterly:4.25,annual:17,min:50000,market:"🇳🇬",tag:"Fixed Income"},
      {name:"FGN Savings Bond",desc:"2–3 yr DMO retail bond for individuals",monthly:1.0,quarterly:3.0,annual:13,min:5000,market:"🇳🇬",tag:"Fixed Income"},
      {name:"Fixed Deposit (Tier-1)",desc:"NDIC-covered guaranteed bank deposit",monthly:1.3,quarterly:3.9,annual:16,min:100000,market:"🇳🇬",tag:"Banking"},
      {name:"Money Market Fund",desc:"ARM, Stanbic IBTC, Meristem liquid funds",monthly:1.5,quarterly:4.5,annual:18,min:10000,market:"🇳🇬",tag:"Fund"},
    ],
    mid:[
      {name:"NGX Dividend Stocks",desc:"Zenith, Stanbic, Seplat — consistent dividend payers",monthly:1.8,quarterly:5.5,annual:22,min:50000,market:"🇳🇬",tag:"Equity"},
      {name:"Cooperative Society Dividend",desc:"Ministry cooperatives — 15–25% annual dividend",monthly:1.5,quarterly:4.5,annual:20,min:10000,market:"🇳🇬",tag:"Cooperative"},
      {name:"Water Vending Business",desc:"Borehole station — unstoppable daily community demand",monthly:8.5,quarterly:26,annual:102,min:200000,market:"🇳🇬",tag:"Business",physical:true,steps:["Drill borehole (₦180–400k) or connect to state supply","Install treatment plant and filling machine","Hire attendant and set up delivery riders","Sell sachets ₦10–20, 50cl ₦50, 1.5L ₦100–150","Target 500–2,000 customers per day"],capital:"₦200,000–₦2,000,000",roi:"4–10 months",support:"State Water Board, NAFDAC"},
      {name:"Broiler Poultry",desc:"6-week cycle — sell live birds to markets and eateries",monthly:6.5,quarterly:20,annual:78,min:150000,market:"🇳🇬",tag:"Agric",physical:true,steps:["Buy 100–500 day-old chicks (₦350–600 each)","Feed starter weeks 1–2, finisher weeks 3–6","Vaccinate for Newcastle and Gumboro","Sell live at ₦3,500–5,500 per bird","Reinvest into next batch continuously"],capital:"₦150,000–₦800,000",roi:"3–5 months",support:"State ADP, CBN AGSMEIS at 5%"},
      {name:"US Dividend ETFs",desc:"High-yield US dividend ETFs via Bamboo or Trove",monthly:0.7,quarterly:2.1,annual:9,min:50000,market:"🌍",tag:"ETF"},
      {name:"Palm Kernel Oil Trading",desc:"Buy bulk PKO at harvest price (Oct–Feb), store and sell at 50–80% margin in dry season",monthly:5.5,quarterly:16.5,annual:66,min:80000,market:"🇳🇬",tag:"Commodity",physical:true,steps:["Source palm kernel oil (PKO) directly from mills in Edo, Delta, Cross River during Oct–Feb harvest at ₦350–500/litre","Buy 50–200 litres minimum — store in sealed steel drums in a cool dry location","PKO stays fresh 12+ months if properly stored — no refrigeration needed","Sell in the off-season (April–September) when prices rise 50–80% to soap makers, food processors, cosmetics companies","Scale up: connect with Unilever, PZ Cussons, Procter & Gamble procurement teams who buy in bulk","Alternatively, add value by cold-pressing into premium skincare oil sold on Jumia at ₦3,500–7,000 per 250ml bottle"],capital:"₦80,000–₦1,500,000",roi:"4–9 months (seasonal)",support:"NECO (Nigerian Export Council), NAFDAC for value-added processing, NEXIM Bank for export financing"},
    ],
    high:[
      {name:"Catfish Farm",desc:"4–6 month grow-out cycle; massive year-round demand",monthly:5.5,quarterly:17,annual:66,min:120000,market:"🇳🇬",tag:"Agric",physical:true,steps:["Dig ponds or use plastic tanks (₦30–80k each)","Stock fingerlings (₦30–50 each), start 500–1,000","Feed floating pellets 2–3x daily","Harvest at 1–1.5kg after 4–6 months","Sell to market women, hotels, restaurants"],capital:"₦120,000–₦1,000,000",roi:"5–8 months",support:"NIRSAL, CBN ACGSF loan"},
      {name:"Mushroom Cultivation",desc:"21-day grow cycle — hotel and restaurant demand",monthly:8.0,quarterly:24,annual:96,min:30000,market:"🇳🇬",tag:"Agric",physical:true,steps:["Source oyster mushroom spawn (₦5,000–10,000)","Fill bags with pasteurised sawdust and rice bran","Maintain 70–80% humidity","Harvest in 21 days; 2–3 flushes per bag","Sell at ₦2,000–4,000/kg to hotels, pharmacies"],capital:"₦30,000–₦200,000",roi:"1–3 months",support:"NIHORT, mushroom farmers associations"},
      {name:"Crypto Yield / Staking",desc:"USDT staking on Binance and KuCoin",monthly:3.0,quarterly:9.5,annual:40,min:50000,market:"🌍",tag:"Crypto"},
    ],
  },
  longterm:{
    zero:[
      {name:"CPS Pension (PFA)",desc:"Contributory Pension via PENCOM-licensed PFA",monthly:0.9,quarterly:2.7,annual:11,min:0,market:"🇳🇬",tag:"Pension"},
      {name:"FGN Sukuk Bond",desc:"Sharia-compliant long-term infrastructure bond",monthly:0.9,quarterly:2.8,annual:11.5,min:10000,market:"🇳🇬",tag:"Fixed Income"},
    ],
    mid:[
      {name:"Land Banking",desc:"Developing areas double in value in 3–5 years",monthly:1.5,quarterly:4.5,annual:18,min:500000,market:"🇳🇬",tag:"Real Estate",physical:true,steps:["Target Kuje, Lugbe (Abuja) or Ibeju-Lekki, Mowe (Lagos)","Verify C-of-O or deed of assignment via AGIS","Confirm land is not under Govt acquisition","Hold 3–7 years as infrastructure arrives","Sell, develop to let, or use as collateral"],capital:"₦500,000–₦10,000,000",roi:"100–400% in 3–7 years",support:"AGIS Abuja, LASG Land Bureau"},
      {name:"Layer Hen Egg Farm",desc:"25 eggs/month per hen — daily passive income",monthly:4.5,quarterly:13.5,annual:54,min:200000,market:"🇳🇬",tag:"Agric",physical:true,steps:["Buy point-of-lay hens at 18 weeks (₦2,500–3,500)","16 hours light daily in battery cages or deep litter","200 hens = ~180 eggs/day = 5–6 crates daily","Sell crates at ₦1,800–2,200 to retailers, schools","Plan replacement cycle at 12–18 months"],capital:"₦200,000–₦1,500,000",roi:"6–9 months",support:"State ADP, NAFDAC feed cert"},
      {name:"NGX Index Fund",desc:"Passively track top 30 Nigerian Exchange stocks",monthly:1.5,quarterly:4.6,annual:19,min:10000,market:"🇳🇬",tag:"Fund"},
      {name:"S&P 500 (VOO/IVV)",desc:"US passive index via Bamboo, Trove, Risevest",monthly:0.95,quarterly:2.9,annual:12.5,min:50000,market:"🌍",tag:"ETF"},
    ],
    high:[
      {name:"Cattle Fattening",desc:"Buy bulls at ₦100–150k, sell at ₦400–700k in 12–18mo",monthly:3.0,quarterly:9.0,annual:36,min:300000,market:"🇳🇬",tag:"Agric",physical:true,steps:["Partner with ranch or Fulani cooperatives","Buy calves ₦100–150k each, start with 5–10","Feed on open range or supplementary hay","Vaccinate: CBPP, FMD, anthrax","Sell at Eid/Sallah peak for ₦700k–₦1.2M"],capital:"₦300,000–₦5,000,000",roi:"12–18 months",support:"NAPRI, NALDA, state ADP"},
      {name:"Transport Fleet (Keke/Bus)",desc:"Daily driver remittance = passive income",monthly:7.0,quarterly:21,annual:84,min:600000,market:"🇳🇬",tag:"Business",physical:true,steps:["Buy Keke (₦600k–1M) or minibus (₦3–8M)","Employ driver on daily remittance ₦4,000–8,000/day","Register with NURTW/RTEAN","Open separate account for remittances","Scale: 3 Kekes = ₦15–20k/day passively"],capital:"₦600,000–₦8,000,000",roi:"10–18 months",support:"NURTW, microfinance vehicle loans"},
      {name:"Bitcoin / Ethereum (Hold)",desc:"5–10 year buy and hold via Luno, Yellow Card",monthly:4.0,quarterly:12.5,annual:55,min:10000,market:"🌍",tag:"Crypto"},
    ],
  },
};

function PhysCard({inv}){return(<div style={{background:"linear-gradient(135deg,#FFFBF0,#F0FAF4)",borderRadius:14,padding:16,marginTop:4,border:`1.5px dashed ${C.amber}77`}}><div style={{fontWeight:800,color:C.forest,fontSize:12,marginBottom:12}}>📋 Setup Guide</div><div style={{background:"white",borderRadius:10,padding:12,marginBottom:10}}>{inv.steps.map((s,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:i<inv.steps.length-1?8:0}}><div style={{minWidth:20,height:20,background:C.jade,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"white",flexShrink:0}}>{i+1}</div><div style={{fontSize:11,color:C.text,lineHeight:1.6}}>{s}</div></div>)}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}><div style={{background:"white",borderRadius:9,padding:10}}><div style={{fontSize:9,color:C.sub,fontWeight:700,marginBottom:3}}>💰 CAPITAL</div><div style={{fontSize:11,fontWeight:700,color:C.jade}}>{inv.capital}</div></div><div style={{background:"white",borderRadius:9,padding:10}}><div style={{fontSize:9,color:C.sub,fontWeight:700,marginBottom:3}}>⏱️ TO ROI</div><div style={{fontSize:11,fontWeight:700,color:C.gold}}>{inv.roi}</div></div></div><div style={{background:"white",borderRadius:9,padding:10}}><div style={{fontSize:9,color:C.sub,fontWeight:700,marginBottom:3}}>🏦 SUPPORT</div><div style={{fontSize:11,color:C.text}}>{inv.support}</div></div></div>);}

function Calc({inv}){
  const [raw,setRaw]=useState("1000000"),[period,setPeriod]=useState("annual"),[yrs,setYrs]=useState(1);
  const p=parseFloat(raw)||0,rate=inv[period]/100,n=period==="monthly"?yrs*12:period==="quarterly"?yrs*4:yrs;
  const final=p*Math.pow(1+rate,n),gain=final-p,pct=p>0?((gain/p)*100).toFixed(1):"0.0";
  return(<div style={{background:C.mist,borderRadius:13,padding:16,marginTop:8}}><div style={{fontWeight:700,color:C.forest,fontSize:13,marginBottom:12}}>📊 Calculator</div><div style={{marginBottom:12}}><label style={{fontSize:11,color:C.sub,fontWeight:700}}>PRINCIPAL (₦)</label><input type="number" value={raw} onChange={e=>setRaw(e.target.value)} style={{width:"100%",marginTop:4,padding:"10px 12px",borderRadius:10,border:`2px solid ${C.jade}`,fontSize:16,fontWeight:700,outline:"none"}}/></div><div style={{display:"flex",gap:6,marginBottom:10}}>{["monthly","quarterly","annual"].map(x=><button key={x} onClick={()=>setPeriod(x)} style={{flex:1,padding:"7px 4px",borderRadius:8,border:"none",background:period===x?C.forest:"white",color:period===x?"white":C.text,fontWeight:600,fontSize:11,cursor:"pointer"}}>{x[0].toUpperCase()+x.slice(1)}</button>)}</div><div style={{marginBottom:12}}><label style={{fontSize:10,color:C.sub,fontWeight:700}}>DURATION: {yrs} YR{yrs>1?"S":""}</label><input type="range" min="1" max="30" value={yrs} onChange={e=>setYrs(+e.target.value)} style={{width:"100%",marginTop:5,accentColor:C.jade}}/></div><div style={{background:"white",borderRadius:11,padding:14,border:`2px solid ${C.jade}`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,color:C.sub}}>Rate</span><span style={{fontWeight:700,color:C.jade}}>{inv[period]}%</span></div><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,color:C.sub}}>Total Gain</span><span style={{fontWeight:700,color:C.gold}}>{fmt(gain)}</span></div><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:12,color:C.sub}}>Total ROI</span><span style={{fontWeight:700,color:C.jade}}>{pct}%</span></div><div style={{borderTop:"1px solid #E0EAE4",paddingTop:10}}><div style={{fontSize:10,color:C.sub}}>After {yrs} yr{yrs>1?"s":""}</div><div style={{fontSize:22,fontWeight:800,color:C.forest}}>{fmt(final)}</div></div></div></div>);
}

function InvestSection(){
  const [plan,setPlan]=useState(null),[risk,setRisk]=useState(null),[sel,setSel]=useState(null),[filt,setFilt]=useState("all");
  const poolData=plan&&risk?INVEST[plan][risk]:null;
  const pool=poolData?(filt==="all"?poolData:filt==="physical"?poolData.filter(i=>i.physical):poolData.filter(i=>!i.physical)):null;
  return(<div><SHdr title="Investment Hub" sub="Digital · Physical · Agricultural · Cooperative"/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:22}}>{[{id:"cashflow",col:C.jade,emoji:"💸",label:"Cash Flow",desc:"Regular income alongside your salary."},{id:"longterm",col:C.forest,emoji:"🌱",label:"Long-Term Wealth",desc:"Compound over 5–30 years."}].map(p=><div key={p.id} onClick={()=>{setPlan(p.id);setRisk(null);setSel(null);}} style={{background:"white",borderRadius:16,padding:18,cursor:"pointer",border:`2px solid ${plan===p.id?p.col:"#E0EAE4"}`,boxShadow:plan===p.id?`0 6px 24px ${p.col}28`:"none",transition:"all 0.22s"}}><div style={{fontSize:32,textAlign:"center",marginBottom:8}}>{p.emoji}</div><div style={{fontWeight:800,color:p.col,fontSize:14,marginBottom:4}}>{p.label}</div><div style={{fontSize:11,color:C.sub,lineHeight:1.6}}>{p.desc}</div>{plan===p.id&&<div style={{marginTop:10,textAlign:"center",fontWeight:700,color:"white",background:p.col,borderRadius:7,padding:"6px 0",fontSize:11}}>✓ Selected</div>}</div>)}</div>{plan&&<div style={{marginBottom:20}}><div style={{fontSize:14,fontWeight:700,color:C.forest,marginBottom:10}}>Risk Appetite</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[{id:"zero",em:"🛡️",lbl:"Zero",col:"#27AE60"},{id:"mid",em:"⚖️",lbl:"Mid",col:C.amber},{id:"high",em:"🚀",lbl:"High",col:C.rose}].map(r=><div key={r.id} onClick={()=>{setRisk(r.id);setSel(null);}} style={{background:"white",borderRadius:12,padding:"12px 8px",cursor:"pointer",textAlign:"center",border:`2px solid ${risk===r.id?r.col:"#E0EAE4"}`,boxShadow:risk===r.id?`0 4px 16px ${r.col}33`:"none",transition:"all 0.2s"}}><div style={{fontSize:22,marginBottom:4}}>{r.em}</div><div style={{fontWeight:700,color:r.col,fontSize:11}}>{r.lbl} Risk</div></div>)}</div></div>}{pool!==null&&<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontSize:14,fontWeight:700,color:C.forest}}>{pool.length} Options</div><div style={{display:"flex",gap:5}}>{[["all","All"],["physical","🏭 Real"],["digital","📱 Digital"]].map(([v,l])=><button key={v} onClick={()=>{setFilt(v);setSel(null);}} style={{padding:"5px 10px",borderRadius:16,border:"none",background:filt===v?C.forest:"#F0F4F2",color:filt===v?"white":C.text,fontWeight:600,fontSize:10,cursor:"pointer"}}>{l}</button>)}</div></div>{pool.length===0&&<div style={{textAlign:"center",color:C.sub,padding:30}}>No results — switch filter above</div>}<div style={{display:"flex",flexDirection:"column",gap:10}}>{pool.map((inv,i)=><div key={i}><div onClick={()=>setSel(sel===i?null:i)} style={{background:"white",borderRadius:13,padding:14,cursor:"pointer",border:`2px solid ${sel===i?(inv.physical?C.amber:C.jade):"#E0EAE4"}`,transition:"all 0.2s"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1,marginRight:8}}><div style={{display:"flex",alignItems:"center",gap:5,marginBottom:5,flexWrap:"wrap"}}><span style={{fontWeight:700,color:C.forest,fontSize:13}}>{inv.name}</span><RiskBadge level={risk}/><span style={{background:inv.physical?C.amber+"20":C.sky+"18",color:inv.physical?C.gold:C.sky,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700}}>{inv.tag}</span><span style={{fontSize:9,color:C.sub}}>{inv.market}</span></div><div style={{fontSize:11,color:C.sub,lineHeight:1.5}}>{inv.desc}</div>{inv.min>0&&<div style={{fontSize:10,color:C.gold,fontWeight:600,marginTop:3}}>Min: {fmt(inv.min)}</div>}</div><div style={{textAlign:"right",minWidth:65}}><div style={{fontSize:9,color:C.sub}}>Annual</div><div style={{fontSize:20,fontWeight:800,color:inv.physical?C.amber:C.jade}}>{inv.annual}%</div><div style={{fontSize:9,color:C.sub}}>{inv.monthly}%/mo</div></div></div><div style={{marginTop:7,textAlign:"center",fontSize:10,color:C.sub}}>{sel===i?"▲ Close":"▼ "+(inv.physical?"Guide + Calc":"Calculator")}</div></div>{sel===i&&<div>{inv.physical&&<PhysCard inv={inv}/>}<Calc inv={inv}/></div>}</div>)}</div></div>}</div>);
}

function BudgetTab(){const [income,setIncome]=useState(""),[vals,setVals]=useState({});const cats=["Housing","Transport","Food","Utilities","Education","Healthcare","Savings","Others"];const total=cats.reduce((s,c)=>s+(parseFloat(vals[c])||0),0),inc=parseFloat(income)||0,bal=inc-total,pct=inc>0?Math.min((total/inc)*100,100):0;return <div><SHdr title="Monthly Budget" sub="Plan every naira before month begins"/><FInput label="MONTHLY TAKE-HOME (₦)" value={income} onChange={setIncome} placeholder="e.g. 250000" type="number"/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>{cats.map(c=><div key={c} style={{background:"white",borderRadius:11,padding:"11px 12px",border:"1px solid #E0EAE4"}}><div style={{fontSize:10,color:C.sub,fontWeight:700,marginBottom:4}}>{c.toUpperCase()}</div><input type="number" value={vals[c]||""} onChange={e=>setVals({...vals,[c]:e.target.value})} placeholder="₦0" style={{width:"100%",padding:"7px 9px",borderRadius:7,border:"1.5px solid #E0EAE4",fontSize:13,outline:"none"}}/></div>)}</div><Card style={{border:`2px solid ${bal>=0?C.mint:C.rose}`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:C.sub}}>Expenses</span><span style={{fontWeight:700,color:C.rose}}>{fmt(total)}</span></div><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{color:C.sub}}>Balance</span><span style={{fontWeight:800,fontSize:20,color:bal>=0?C.jade:C.rose}}>{fmt(bal)}</span></div><div style={{background:"#EEF6F1",borderRadius:7,height:10,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:pct>85?C.rose:C.jade,borderRadius:7}}/></div><div style={{fontSize:11,color:C.sub,marginTop:5}}>{pct.toFixed(0)}% of income allocated</div></Card></div>;}

function SavingsTab(){const [goals,setGoals]=useState([{name:"Emergency Fund",target:1500000,saved:380000,col:C.jade},{name:"NHF Property",target:5000000,saved:900000,col:C.gold},{name:"Children's Education",target:3000000,saved:500000,col:C.sky}]);const [adding,setAdding]=useState(false),[ng,setNg]=useState({name:"",target:"",saved:""});return <div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><SHdr title="Savings Goals" sub=""/><button onClick={()=>setAdding(!adding)} style={{background:C.jade,color:"white",border:"none",borderRadius:9,padding:"9px 14px",fontWeight:700,cursor:"pointer",fontSize:12,flexShrink:0}}>+ Add</button></div>{adding&&<Card style={{marginBottom:14}}>{[["Goal name","text","name"],["Target (₦)","number","target"],["Saved so far (₦)","number","saved"]].map(([ph,t,k])=><input key={k} type={t} placeholder={ph} value={ng[k]} onChange={e=>setNg({...ng,[k]:e.target.value})} style={{width:"100%",marginBottom:8,padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.jade}`,fontSize:13,outline:"none"}}/>)}<button onClick={()=>{if(!ng.name)return;setGoals([...goals,{name:ng.name,target:parseFloat(ng.target),saved:parseFloat(ng.saved)||0,col:C.lilac}]);setNg({name:"",target:"",saved:""});setAdding(false);}} style={{background:C.forest,color:"white",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontWeight:700}}>Save</button></Card>}{goals.map((g,i)=>{const p=Math.min((g.saved/g.target)*100,100);return <Card key={i} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontWeight:700,color:C.forest}}>{g.name}</div><div style={{fontSize:11,color:C.sub}}>Target: {fmt(g.target)}</div></div><div style={{textAlign:"right"}}><div style={{fontWeight:800,color:g.col,fontSize:18}}>{p.toFixed(0)}%</div><div style={{fontSize:10,color:C.sub}}>Left: {fmt(g.target-g.saved)}</div></div></div><div style={{background:"#F0F4F2",borderRadius:7,height:10,overflow:"hidden"}}><div style={{height:"100%",width:`${p}%`,background:g.col,borderRadius:7}}/></div><div style={{marginTop:5,fontSize:12,color:C.sub}}>Saved: <b style={{color:C.text}}>{fmt(g.saved)}</b></div></Card>;})} </div>;}

function PlanSection(){const [sub,setSub]=useState("Budget");return <div><SubNav tabs={["Budget","Savings Goals"]} active={sub} set={setSub}/>{sub==="Budget"&&<BudgetTab/>}{sub==="Savings Goals"&&<SavingsTab/>}</div>;}

function PAYETool(){const [basic,setBasic]=useState(""),[housing,setHousing]=useState(""),[transport,setTransport]=useState(""),[other,setOther]=useState("");const b=parseFloat(basic)||0,h=parseFloat(housing)||0,t=parseFloat(transport)||0,o=parseFloat(other)||0;const gross=(b+h+t+o)*12,pension=b*12*0.08,nhf=b*12*0.025,nhis=gross*0.0175;const cra=Math.max(200000,gross*0.01)+gross*0.2,chargeable=Math.max(0,gross-pension-nhf-nhis-cra);const calcTax=inc=>{let c=inc,x=0;for(const[lim,r]of[[300000,.07],[300000,.11],[500000,.15],[500000,.19],[1600000,.21],[Infinity,.24]]){x+=Math.min(c,lim)*r;c-=Math.min(c,lim);if(c<=0)break;}return x;};const tax=calcTax(chargeable),mg=b+h+t+o,mn=mg-b*0.08-b*0.025-mg*0.0175-tax/12;return <div><SHdr title="PAYE Calculator" sub="Decode every payslip deduction"/><Card><FInput label="BASIC SALARY (₦/month)" value={basic} onChange={setBasic} type="number" placeholder="e.g. 150000"/><FInput label="HOUSING ALLOWANCE (₦/month)" value={housing} onChange={setHousing} type="number" placeholder="e.g. 60000"/><FInput label="TRANSPORT ALLOWANCE (₦/month)" value={transport} onChange={setTransport} type="number" placeholder="e.g. 40000"/><FInput label="OTHER ALLOWANCES (₦/month)" value={other} onChange={setOther} type="number" placeholder="e.g. 20000"/></Card>{b>0&&<Card style={{marginTop:14}}>{[["Gross",mg,C.text],["Pension (8%)",-(b*0.08),C.rose],["NHF (2.5%)",-(b*0.025),C.rose],["NHIS (1.75%)",-(mg*0.0175),C.rose],["PAYE Tax",-(tax/12),C.rose]].map(([l,v,col])=><div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:8,paddingBottom:8,borderBottom:"1px solid #F0F4F2"}}><span style={{fontSize:13,color:C.sub}}>{l}</span><span style={{fontSize:13,fontWeight:700,color:col}}>{v<0?"−":""}{fmt(Math.abs(v))}</span></div>)}<div style={{display:"flex",justifyContent:"space-between",background:C.mist,borderRadius:9,padding:"12px 14px"}}><span style={{fontWeight:700,color:C.forest}}>Net Take-Home</span><span style={{fontSize:18,fontWeight:800,color:C.jade}}>{fmt(mn)}</span></div></Card>}</div>;}

function RetirementTool(){const [age,setAge]=useState("35"),[retAge,setRetAge]=useState("60"),[rsaBal,setRsaBal]=useState("500000"),[mContrib,setMContrib]=useState("20000"),[ret,setRet]=useState(11);const yrs=Math.max(0,parseFloat(retAge)-parseFloat(age)),r=ret/100/12,n=yrs*12;const mc=parseFloat(mContrib)||0,bal=parseFloat(rsaBal)||0;const fv=bal*Math.pow(1+r,n)+mc*(Math.pow(1+r,n)-1)/r,monthlyIncome=fv/Math.max(1,(parseFloat(retAge)-50)*12);return <div><SHdr title="Retirement Projection" sub="See what your pension will look like"/><Card><FInput label="CURRENT AGE" value={age} onChange={setAge} type="number" placeholder="35"/><FInput label="RETIREMENT AGE" value={retAge} onChange={setRetAge} type="number" placeholder="60"/><FInput label="CURRENT RSA BALANCE (₦)" value={rsaBal} onChange={setRsaBal} type="number" placeholder="500000"/><FInput label="MONTHLY CONTRIBUTION (₦)" value={mContrib} onChange={setMContrib} type="number" placeholder="20000"/><div style={{marginBottom:12}}><label style={{fontSize:11,color:C.sub,fontWeight:700}}>EXPECTED RETURN: {ret}%</label><input type="range" min="5" max="18" value={ret} onChange={e=>setRet(+e.target.value)} style={{width:"100%",marginTop:5,accentColor:C.jade}}/></div></Card><Card style={{marginTop:12,background:`linear-gradient(135deg,${C.forest},${C.jade})`,border:"none"}}><div style={{fontSize:12,color:"rgba(255,255,255,0.6)",fontWeight:700}}>RSA AT RETIREMENT</div><div style={{fontSize:30,fontWeight:800,color:"white",margin:"6px 0"}}>{fmtK(fv)}</div><div style={{display:"flex",gap:20}}><div><div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>Monthly Income</div><div style={{fontSize:16,fontWeight:700,color:C.amber}}>{fmt(monthlyIncome)}</div></div><div><div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>Years Left</div><div style={{fontSize:16,fontWeight:700,color:C.mint}}>{yrs}</div></div></div></Card>{monthlyIncome<150000&&<Card style={{marginTop:10,border:`2px solid ${C.amber}`}}><div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:4}}>⚠️ Retirement Income Gap</div><div style={{fontSize:12,color:C.text,lineHeight:1.6}}>Projected pension of {fmt(monthlyIncome)}/month may not cover typical expenses. Start parallel investments now.</div></Card>}</div>;}

function ToolsSection(){const [sub,setSub]=useState("PAYE Tax");return <div><SubNav tabs={["PAYE Tax","Retirement"]} active={sub} set={setSub}/>{sub==="PAYE Tax"&&<PAYETool/>}{sub==="Retirement"&&<RetirementTool/>}</div>;}

const MODULES=[{title:"Understanding Your Payslip",emoji:"📄",dur:"4 min",content:"NHF (2.5% of basic): Builds in your FMBN account for a 6% mortgage.\n\nPENSION (8%): Goes to your RSA in your PFA.\n\nPAYE TAX: Calculated on chargeable income after all reliefs. Ensure your employer applies CRA, pension, NHF, and NHIS reliefs."},{title:"The 3-Bucket System",emoji:"🪣",dur:"5 min",content:"BUCKET 1 — SAFETY (20–30%): Emergency fund in money market fund. Never touch this.\n\nBUCKET 2 — INCOME (40–50%): T-Bills, dividend stocks, cooperative thrift, poultry, water business.\n\nBUCKET 3 — GROWTH (20–30%): Land, NGX index fund, dollar ETFs.\n\nRULE: Fill Bucket 1 first, then Bucket 2, then Bucket 3."},{title:"Good Debt vs Bad Debt",emoji:"💳",dur:"4 min",content:"BAD DEBT: Borrowing to buy depreciating assets — phones, clothes, cars.\n\nGOOD DEBT: Borrowing for assets earning more than the loan rate. NHF at 6% for land appreciating 20%/yr = net gain.\n\nRULE: Only borrow if investment return clearly exceeds the interest rate."},{title:"Compound Interest in Naira",emoji:"📈",dur:"5 min",content:"₦50,000/month at 17% (T-Bill rate):\nYear 5 = ₦4.3M\nYear 10 = ₦13.8M\nYear 20 = ₦113M\n\nRULE OF 72: 72 ÷ rate = years to double. At 17%: 4.2 years.\n\nACTION: Automate ₦10,000/month on Cowrywise on payday. Never withdraw for 5 years."},{title:"Cooperative Society Mastery",emoji:"🤝",dur:"5 min",content:"WHAT YOU GET:\n- Loans at 5–10% vs bank rates of 25–35%\n- 15–25% annual dividend on shares\n- Emergency advances and group insurance\n\nHOW TO MAXIMIZE:\n1. Buy maximum cooperative shares allowed\n2. Use loans for investments only\n3. Join the Ajo/Esusu group\n4. Consider getting elected to the board"}];

function LearnSection(){const [open,setOpen]=useState(null);return <div><SHdr title="Financial Intelligence" sub="Key lessons every civil servant must know"/>{MODULES.map((m,i)=><div key={i} style={{marginBottom:10}}><div onClick={()=>setOpen(open===i?null:i)} style={{background:"white",borderRadius:13,padding:16,cursor:"pointer",border:`2px solid ${open===i?C.jade:"#E0EAE4"}`,transition:"all 0.2s"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:24}}>{m.emoji}</span><div><div style={{fontWeight:700,color:C.forest,fontSize:13}}>{m.title}</div><div style={{fontSize:10,color:C.sub,marginTop:2}}>{m.dur} read</div></div></div><span style={{fontSize:14,color:C.sub}}>{open===i?"▲":"▼"}</span></div>{open===i&&<div style={{marginTop:12,fontSize:12,color:C.text,lineHeight:1.85,borderTop:"1px solid #F0F4F2",paddingTop:12,whiteSpace:"pre-line"}}>{m.content}</div>}</div></div>)}</div>;}

function AIAdvisor(){
  const [q,setQ]=useState(""),[msgs,setMsgs]=useState([{role:"assistant",text:"Hello! I am your FinPath AI Advisor — built for Nigerian civil and public servants. Ask me about T-Bills, catfish farming, NHF mortgages, pension planning, cooperative societies, dollar ETFs, or any investment in this platform."}]),[loading,setLoading]=useState(false);
  const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"})},[msgs]);
  const ask=async()=>{if(!q.trim()||loading)return;const text=q.trim();setMsgs(m=>[...m,{role:"user",text}]);setQ("");setLoading(true);try{const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:"You are FinPath AI Advisor — expert financial coach for Nigerian civil and public servants. Cover digital investments (FGN bonds, T-bills, NGX stocks, cooperative dividends, US ETFs via Bamboo/Trove/Risevest, crypto), physical businesses (water vending, transport fleet, bakery, cooking gas), agriculture (broiler/layer poultry, catfish, cassava, pig farming, snail farming, cattle fattening, mushroom, beekeeping), real estate (NHF mortgage at 6%, land banking), pension (CPS, PFA, RSA), and government funding (CBN AGSMEIS, NIRSAL, BOI, NHF). Give practical Nigeria-specific advice with real platforms and naira figures.",messages:[...msgs.filter((_,i)=>i>0).map(m=>({role:m.role,content:m.text})),{role:"user",content:text}]})});const data=await res.json();setMsgs(m=>[...m,{role:"assistant",text:data.content?.[0]?.text||"Sorry, please try again."}]);}catch{setMsgs(m=>[...m,{role:"assistant",text:"Connection error. Please try again."}]);}setLoading(false);};
  const prompts=["Start catfish farm ₦200k","Best zero-risk ₦500k","NHF mortgage steps","Build ₦10M in 5 years"];
  return <div style={{display:"flex",flexDirection:"column"}}><SHdr title="AI Financial Advisor" sub="Powered by Claude · Built for Nigerian civil servants"/><div style={{overflowY:"auto",display:"flex",flexDirection:"column",gap:10,maxHeight:400,marginBottom:12}}>{msgs.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}><div style={{maxWidth:"84%",padding:"11px 14px",borderRadius:m.role==="user"?"16px 16px 3px 16px":"16px 16px 16px 3px",background:m.role==="user"?C.forest:"white",color:m.role==="user"?"white":C.text,fontSize:13,lineHeight:1.65,border:m.role==="assistant"?"1px solid #E0EAE4":"none"}}>{m.text}</div></div>)}{loading&&<div style={{display:"flex",gap:5,padding:"10px 14px",background:"white",borderRadius:12,width:"fit-content",border:"1px solid #E0EAE4"}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,background:C.jade,borderRadius:"50%",animation:`bounce 1s ${i*0.2}s infinite`}}/>)}</div>}<div ref={endRef}/></div><div style={{display:"flex",gap:8,marginBottom:10}}><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask()} placeholder="Ask about investing, farming, pension..." style={{flex:1,padding:"11px 14px",borderRadius:12,border:`2px solid ${C.jade}`,fontSize:13,outline:"none"}}/><button onClick={ask} disabled={loading||!q.trim()} style={{background:C.forest,color:"white",border:"none",borderRadius:12,padding:"11px 16px",fontWeight:700,cursor:"pointer",opacity:loading?0.6:1,fontSize:16}}>➤</button></div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{prompts.map((p,i)=><button key={i} onClick={()=>setQ(p)} style={{background:C.mist,border:`1px solid ${C.jade}44`,borderRadius:18,padding:"5px 11px",fontSize:10,color:C.jade,cursor:"pointer",fontWeight:500}}>{p}</button>)}</div></div>;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
// ─── TIP OF THE DAY CARD ─────────────────────────────────────────────────────
const TIPS = [
  {
    short: "Catfish farming: ₦120k → ₦200k in 5 months.",
    emoji: "🐟",
    title: "Catfish Farming Returns",
    category: "Agriculture",
    detail: "Catfish farming is one of the fastest cash-generating agricultural investments available to Nigerian civil servants. Here is how it works in practice.",
    points: [
      "Start with ₦120,000–₦200,000 for your first batch of 500–1,000 fingerlings",
      "Fingerlings cost ₦30–50 each — buy from a certified hatchery in your state",
      "Feed floating pellets twice daily — total feed cost is roughly ₦60–80k per cycle",
      "After 4–6 months, each fish weighs 1–1.5kg and sells for ₦1,200–1,800/kg",
      "500 fish harvested at 1.2kg average = 600kg × ₦1,500 = ₦900,000 gross",
      "Net profit after costs: ₦300,000–₦500,000 per cycle — that is 2–4 cycles per year",
    ],
    action: "Start small with 200 fish in plastic tanks in your backyard. CBN ACGSF gives agric loans at 9% — visit any commercial bank to apply.",
    color: C.jade,
  },
  {
    short: "FGN T-Bills at 17% p.a. — safer than any bank savings account.",
    emoji: "🛡️",
    title: "FGN Treasury Bills",
    category: "Zero-Risk Investing",
    detail: "Federal Government of Nigeria Treasury Bills are the safest investment in Nigeria — backed by the full faith of the Federal Government. Your principal is 100% guaranteed.",
    points: [
      "Current rate: approximately 17% per annum — far above bank savings rates of 4–6%",
      "Minimum investment is ₦50,000 — accessible to any civil servant",
      "Tenures available: 91 days, 182 days, or 364 days",
      "Buy directly on the DMO portal (dmo.gov.ng) or through your bank",
      "Interest is paid UPFRONT — you receive your return on the day you invest",
      "At retirement, a ₦2M T-Bill investment earns ₦340,000 per year completely risk-free",
    ],
    action: "Open dmo.gov.ng today, register with your BVN and bank account, and start with as little as ₦50,000. It takes under 15 minutes.",
    color: "#27AE60",
  },
  {
    short: "200 layer hens = ~180 eggs per day = ₦10k+ daily passive income.",
    emoji: "🥚",
    title: "Layer Hen Egg Farming",
    category: "Agriculture",
    detail: "Layer hen farming is the closest thing to a passive income machine in Nigerian agriculture. Once your hens are producing, you collect cash daily — 365 days a year.",
    points: [
      "Buy 200 point-of-lay hens at 18 weeks old (₦2,500–3,500 each) = ₦500,000–700,000",
      "Each healthy hen lays approximately 25 eggs per month",
      "200 hens = 5,000 eggs/month = 167 crates (30 eggs per crate)",
      "Sell each crate for ₦1,800–2,200 to retailers, schools, caterers, hospitals",
      "Monthly gross: 167 × ₦2,000 = ₦334,000. Net after feed: ₦180,000–220,000",
      "Hens remain productive for 12–18 months before you replace the flock",
    ],
    action: "Start with 100 hens to test the market. Supply to your children's school, colleagues, and a nearby eatery. Use deep litter housing to reduce startup cost.",
    color: C.amber,
  },
  {
    short: "Land in Abuja corridors doubles every 4–5 years. Buy now.",
    emoji: "🏡",
    title: "Land Banking Strategy",
    category: "Real Estate",
    detail: "Land banking — buying undeveloped land in emerging corridors and holding it — has made more Nigerian civil servants wealthy than almost any other investment. The strategy is simple: government infrastructure follows a predictable path.",
    points: [
      "Target areas: Kuje, Lugbe, Pyakasa, Gwagwalada (Abuja) or Ibeju-Lekki, Mowe, Epe (Lagos)",
      "Land bought in Lugbe 5 years ago for ₦800k now sells for ₦3.5M–5M",
      "Government road projects, NNPC estates, and new ministries announce locations years in advance",
      "Always verify: C-of-O or registered deed of assignment, no government acquisition gazette",
      "Use the AGIS portal (Abuja) or Lagos Land Bureau to confirm land status",
      "You can use a cooperative loan at 5–10% to buy land that appreciates at 20–30% per year",
    ],
    action: "Visit your state land registry or AGIS.gov.ng to identify upcoming development corridors. Budget ₦500k minimum. Buy through a registered developer or lawyer.",
    color: C.gold,
  },
  {
    short: "Your cooperative loan at 5–10% beats every commercial bank rate.",
    emoji: "🤝",
    title: "Cooperative Society Mastery",
    category: "Civil Servant Advantage",
    detail: "Your ministry cooperative society is your single biggest financial advantage as a civil servant — and most people dramatically underuse it. A loan from your cooperative at 5–10% versus a commercial bank at 25–35% is the difference between wealth and debt.",
    points: [
      "On a ₦500,000 loan: cooperative interest = ₦25,000–50,000. Bank interest = ₦125,000–175,000",
      "Loan repayment is deducted from your salary — no risk of default, so they lend freely",
      "Cooperative shares pay 15–25% annual dividend — better than most fixed deposits",
      "Thrift/Ajo within the cooperative gives you a lump sum every few months",
      "Get elected to the cooperative board — preferential loan access follows",
      "Use cooperative loans ONLY for investments that return more than the loan rate",
    ],
    action: "Visit your ministry cooperative today. Buy the maximum shares allowed. Apply for a loan to fund a physical investment — poultry, water business, or land. Never use cooperative loans for consumption.",
    color: C.forest,
  },
  {
    short: "Mushroom cultivation: ₦30k startup, 21-day cycle, premium returns.",
    emoji: "🍄",
    title: "Mushroom Cultivation",
    category: "Agriculture",
    detail: "Mushroom farming is the fastest agricultural investment cycle in Nigeria. From setup to first harvest is just 21 days — and you can run multiple batches simultaneously in your backyard, spare room, or shed.",
    points: [
      "Start with oyster mushroom spawn (₦5,000–10,000 for your first batch)",
      "Fill plastic bags with pasteurised sawdust mixed with rice bran and wheat bran",
      "Maintain 70–80% humidity in your grow space — a spray bottle works for small scale",
      "Harvest in 21 days. Each bag gives 2–3 flushes (harvests) before replacing",
      "Sell fresh oyster mushrooms at ₦2,000–4,000 per kg to hotels, pharmacies, supermarkets",
      "30 bags producing 300g each per flush = 9kg × ₦3,000 = ₦27,000 every 3 weeks",
    ],
    action: "Contact NIHORT (nihort.gov.ng) for training and spawn. Start with 20–30 bags to test. Build relationships with hotel kitchens — they pay premium prices for consistent supply.",
    color: C.lilac,
  },
  {
    short: "Palm Kernel Oil: buy at ₦350/L harvest season, sell at ₦600/L dry season.",
    emoji: "🌴",
    title: "Palm Kernel Oil Trading",
    category: "Commodity Trading",
    detail: "Palm Kernel Oil (PKO) is one of Nigeria's most reliable seasonal commodity plays. The price swing between harvest season and off-season is predictable and significant — making it ideal for civil servants who can buy and hold.",
    points: [
      "Harvest season (October–February): PKO from mills costs ₦350–500 per litre",
      "Off-season (April–September): same PKO sells for ₦580–700 per litre — a 50–80% margin",
      "PKO stores safely for 12+ months in sealed steel drums at room temperature",
      "Industrial demand is recession-proof: soap makers, cosmetics companies, food processors",
      "Start with ₦80,000 for 200 litres — sell for ₦130,000–160,000 in off-season",
      "Scale up by connecting directly to soap manufacturers (Unilever, PZ Cussons procurement teams buy bulk)",
    ],
    action: "Source PKO directly from mills in Edo, Delta, or Cross River states during October–December. Store in sealed 200-litre drums. NECO (Nigerian Export Council) can connect you with export buyers for even higher prices.",
    color: C.rose,
  },
];

function TipCard() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [expanded, setExpanded] = useState(false);
  const tip = TIPS[idx];

  const prev = () => { setIdx(i => (i - 1 + TIPS.length) % TIPS.length); setExpanded(false); };
  const next = () => { setIdx(i => (i + 1) % TIPS.length); setExpanded(false); };

  return (
    <div style={{marginBottom: 14}}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          background: `linear-gradient(135deg, ${tip.color}, ${tip.color}CC)`,
          borderRadius: expanded ? "14px 14px 0 0" : 14,
          padding: 16,
          cursor: "pointer",
          transition: "border-radius 0.2s",
        }}
      >
        {/* Header row */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: 8}}>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            <span style={{fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.6)", letterSpacing:1.5}}>💡 TIP OF THE DAY</span>
            <span style={{background:"rgba(255,255,255,0.2)", borderRadius:20, padding:"2px 8px", fontSize:9, fontWeight:700, color:"white"}}>{tip.category}</span>
          </div>
          <span style={{fontSize:11, color:"rgba(255,255,255,0.7)", fontWeight:600}}>{idx + 1}/{TIPS.length}</span>
        </div>

        {/* Emoji + short tip */}
        <div style={{display:"flex", gap:10, alignItems:"flex-start", marginBottom: 10}}>
          <div style={{fontSize:28, flexShrink:0, lineHeight:1}}>{tip.emoji}</div>
          <div style={{fontSize:13, lineHeight:1.7, color:"white", fontWeight:600}}>{tip.short}</div>
        </div>

        {/* Expand / nav row */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div style={{display:"flex", gap:6}}>
            <button
              onClick={e => { e.stopPropagation(); prev(); }}
              style={{background:"rgba(255,255,255,0.2)", border:"none", borderRadius:8, width:28, height:28, color:"white", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center"}}
            >←</button>
            <button
              onClick={e => { e.stopPropagation(); next(); }}
              style={{background:"rgba(255,255,255,0.2)", border:"none", borderRadius:8, width:28, height:28, color:"white", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center"}}
            >→</button>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:6}}>
            {/* Dot indicators */}
            <div style={{display:"flex", gap:4}}>
              {TIPS.map((_, i) => (
                <div key={i} style={{width: i === idx ? 16 : 5, height:5, borderRadius:3, background: i === idx ? "white" : "rgba(255,255,255,0.35)", transition:"width 0.3s"}}/>
              ))}
            </div>
            <div style={{background:"rgba(255,255,255,0.2)", borderRadius:20, padding:"5px 12px", fontSize:11, color:"white", fontWeight:700, marginLeft:4}}>
              {expanded ? "▲ Less" : "▼ Learn More"}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div style={{background:"white", borderRadius:"0 0 14px 14px", border:`2px solid ${tip.color}`, borderTop:"none", overflow:"hidden"}}>
          <div style={{padding:18}}>
            {/* Title */}
            <div style={{display:"flex", gap:10, alignItems:"center", marginBottom:14}}>
              <div style={{width:40, height:40, background:tip.color+"18", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0}}>{tip.emoji}</div>
              <div>
                <div style={{fontWeight:800, color:C.forest, fontSize:15}}>{tip.title}</div>
                <div style={{fontSize:11, color:tip.color, fontWeight:700, marginTop:2}}>{tip.category}</div>
              </div>
            </div>

            {/* Detail text */}
            <div style={{fontSize:12, color:C.sub, lineHeight:1.7, marginBottom:14}}>{tip.detail}</div>

            {/* Bullet points */}
            <div style={{background:`${tip.color}0D`, borderRadius:10, padding:14, marginBottom:14}}>
              {tip.points.map((p, i) => (
                <div key={i} style={{display:"flex", gap:8, marginBottom: i < tip.points.length - 1 ? 10 : 0}}>
                  <div style={{minWidth:20, height:20, background:tip.color, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:"white", flexShrink:0, marginTop:1}}>{i + 1}</div>
                  <div style={{fontSize:12, color:C.text, lineHeight:1.6}}>{p}</div>
                </div>
              ))}
            </div>

            {/* Action box */}
            <div style={{background:`linear-gradient(135deg,${tip.color},${tip.color}BB)`, borderRadius:10, padding:14}}>
              <div style={{fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.65)", marginBottom:5, letterSpacing:1}}>✅ YOUR ACTION STEP</div>
              <div style={{fontSize:12, color:"white", lineHeight:1.65}}>{tip.action}</div>
            </div>

            {/* Navigation inside expanded */}
            <div style={{display:"flex", gap:8, marginTop:14}}>
              <button onClick={prev} style={{flex:1, background:"#F0F4F2", border:"none", borderRadius:9, padding:"10px 0", color:C.text, fontWeight:700, cursor:"pointer", fontSize:12}}>← Previous Tip</button>
              <button onClick={next} style={{flex:1, background:tip.color, border:"none", borderRadius:9, padding:"10px 0", color:"white", fontWeight:700, cursor:"pointer", fontSize:12}}>Next Tip →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard({user,onUpgrade,onOpenTutorial,onViewProfile,setTab}){
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,color:C.forest,margin:0,fontFamily:"'Playfair Display',serif"}}>Good day, {user.name.split(" ")[0]} 👋</h2>
          <p style={{fontSize:11,color:C.sub,margin:"4px 0 0"}}>{user.gradeLevel||"Civil Servant"} · {user.state||"Nigeria"}</p>
        </div>
        <button onClick={onViewProfile} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>
          <Avatar user={user} size={44} fontSize={18}/>
        </button>
      </div>
      <TrialBanner user={user} onUpgrade={onUpgrade}/>
      <div onClick={onOpenTutorial} style={{background:`linear-gradient(135deg,${C.sky},${C.lilac})`,borderRadius:14,padding:16,marginBottom:12,cursor:"pointer",display:"flex",gap:12,alignItems:"center"}}>
        <div style={{width:46,height:46,background:"rgba(255,255,255,0.2)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📹</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,color:"white",fontSize:14,marginBottom:2}}>Watch: How to Use FinPath</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.8)"}}>7 tutorial videos · Start with the 3-min intro</div>
        </div>
        <div style={{background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"6px 12px",fontSize:11,color:"white",fontWeight:700,whiteSpace:"nowrap"}}>Watch →</div>
      </div>
      <TipCard />
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[
          {l:"Invest",ico:"📈",sub:"35+ investment types",id:"Invest"},
          {l:"Plan",ico:"📋",sub:"Budget & savings",id:"Plan"},
          {l:"Tools",ico:"🛠️",sub:"PAYE · Retirement",id:"Tools"},
          {l:"Learn",ico:"📚",sub:"Financial lessons",id:"Learn"},
        ].map((b,i)=>(
          <Card key={i} onClick={()=>setTab&&setTab(b.id)} style={{cursor:"pointer",padding:"14px 12px"}}>
            <div style={{fontSize:22,marginBottom:4}}>{b.ico}</div>
            <div style={{fontSize:12,fontWeight:700,color:C.forest}}>{b.l}</div>
            <div style={{fontSize:10,color:C.sub,marginTop:2}}>{b.sub}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── LANDING ──────────────────────────────────────────────────────────────────
function LandingPage({onGetStarted,onLogin}){
  const features=[{icon:"📈",title:"35+ Investments",desc:"T-Bills, NGX stocks, poultry, catfish, land banking, dollar ETFs and more."},{icon:"🌾",title:"Agricultural Guides",desc:"Step-by-step setup guides with capital, timelines and government funding."},{icon:"🛠️",title:"Financial Tools",desc:"PAYE calculator, retirement projector, net worth tracker, debt planner."},{icon:"🤖",title:"AI Financial Advisor",desc:"Claude-powered advisor trained on Nigeria's investment landscape."},{icon:"📚",title:"Financial Literacy",desc:"10 lessons on tax, compound interest, cooperatives, estate planning."},{icon:"🎁",title:"30-Day Free Trial",desc:"Full Pro access from Day 1. No credit card. No hidden fees."}];
  return(
    <div style={{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:C.cream,maxWidth:560,margin:"0 auto",minHeight:"100vh"}}>
      <div style={{background:`linear-gradient(160deg,${C.forest} 0%,${C.jade} 100%)`,padding:"20px 20px 50px",position:"relative",overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32}}>
          <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"white",fontWeight:800}}>FinPath<span style={{color:C.amber}}>.</span></div><div style={{fontSize:8,color:C.mint,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>Nigeria</div></div>
          <button onClick={onLogin} style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:20,padding:"8px 18px",color:"white",fontWeight:700,cursor:"pointer",fontSize:12}}>Log In</button>
        </div>
        <div style={{display:"inline-block",background:C.amber+"33",border:`1px solid ${C.amber}55`,borderRadius:20,padding:"5px 14px",fontSize:11,color:C.amber,fontWeight:700,marginBottom:14}}>🇳🇬 BUILT FOR NIGERIAN CIVIL SERVANTS</div>
        <h1 style={{fontSize:30,fontWeight:800,color:"white",lineHeight:1.25,margin:"0 0 14px",fontFamily:"'Playfair Display',serif"}}>Grow Your Wealth<br/><span style={{color:C.amber}}>Beyond Your Salary</span></h1>
        <div style={{background:C.amber+"33",border:`1px solid ${C.amber}55`,borderRadius:12,padding:"10px 14px",marginBottom:24,display:"inline-block"}}><span style={{fontSize:13,fontWeight:800,color:C.amber}}>🎁 30 days FREE Premium</span><span style={{fontSize:12,color:"rgba(255,255,255,0.8)",marginLeft:8}}>— no card needed</span></div>
        <div style={{display:"flex",gap:10}}><button onClick={onGetStarted} style={{background:C.amber,border:"none",borderRadius:12,padding:"14px 28px",color:C.forest,fontWeight:800,cursor:"pointer",fontSize:14}}>Start Free Trial →</button><button onClick={onLogin} style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:12,padding:"14px 24px",color:"white",fontWeight:700,cursor:"pointer",fontSize:14}}>I Have an Account</button></div>
      </div>
      <div style={{padding:"32px 20px"}}>
        <h2 style={{fontSize:20,fontWeight:800,color:C.forest,fontFamily:"'Playfair Display',serif",margin:"0 0 20px",textAlign:"center"}}>Everything you need to build wealth</h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:28}}>{features.map((f,i)=><Card key={i} style={{padding:14}}><div style={{fontSize:24,marginBottom:8}}>{f.icon}</div><div style={{fontWeight:700,color:C.forest,fontSize:13,marginBottom:5}}>{f.title}</div><div style={{fontSize:11,color:C.sub,lineHeight:1.6}}>{f.desc}</div></Card>)}</div>
        <div style={{background:`linear-gradient(135deg,${C.forest},${C.jade})`,borderRadius:16,padding:24,textAlign:"center"}}>
          <h2 style={{fontSize:20,fontWeight:800,color:"white",fontFamily:"'Playfair Display',serif",margin:"0 0 10px"}}>Start building wealth today</h2>
          <button onClick={onGetStarted} style={{background:C.amber,border:"none",borderRadius:12,padding:"14px 32px",color:C.forest,fontWeight:800,cursor:"pointer",fontSize:14,marginBottom:10}}>Create Free Account — 30 Days Premium →</button>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.45)"}}>No credit card required · Cancel anytime</div>
        </div>
      </div>
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function AuthScreen({mode:initialMode,onAuth,onBack}){
  const [mode,setMode]=useState(initialMode||"signup"),[step,setStep]=useState(1);
  const [form,setForm]=useState(()=>{
    return {name:"",email:"",password:"",phone:"",gradeLevel:"",ministry:"",state:""};
  });
  const [errors,setErrors]=useState({}),[loading,setLoading]=useState(false),[agreed,setAgreed]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const gradeLevels=["GL 04","GL 05","GL 06","GL 07","GL 08","GL 09","GL 10","GL 12","GL 13","GL 14","GL 15","GL 16","GL 17","Director","Permanent Secretary"];
  const states=["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];
  const v1=()=>{const e={};if(form.name.trim().length<3)e.name="Enter your full name.";if(!form.email.includes("@"))e.email="Enter a valid email.";if(form.password.length<6)e.password="At least 6 characters.";setErrors(e);return!Object.keys(e).length;};
  const v2=()=>{const e={};if(!form.gradeLevel)e.gradeLevel="Select your grade level.";if(!form.state)e.state="Select your state.";setErrors(e);return!Object.keys(e).length;};
  const handleSignup=()=>{if(!agreed){setErrors({agreed:"Please accept the terms."});return;}setLoading(true);setTimeout(()=>{const r=AUTH.signup({...form,password:form.password});if(!r.ok){setErrors({email:r.error});setLoading(false);return;}onAuth(r.user);},800);};
  const handleLogin=()=>{const e={};if(!form.email.includes("@"))e.email="Enter a valid email.";if(!form.password)e.password="Enter your password.";setErrors(e);if(Object.keys(e).length)return;setLoading(true);setTimeout(()=>{const r=AUTH.login(form.email,form.password);if(!r.ok){setErrors({password:r.error});setLoading(false);return;}onAuth(r.user);},800);};
  const selStyle=err=>({width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${err?C.rose:"#E0EAE4"}`,fontSize:14,outline:"none",background:"white",appearance:"none",cursor:"pointer"});
  return(
    <div style={{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:C.cream,minHeight:"100vh",maxWidth:560,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      <div style={{background:C.forest,padding:"16px 20px 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,padding:"6px 10px",color:"white",cursor:"pointer",fontSize:14}}>←</button>
          <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"white",fontWeight:800}}>FinPath<span style={{color:C.amber}}>.</span></div><div style={{fontSize:8,color:C.mint,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>Nigeria</div></div>
        </div>
      </div>
      <div style={{flex:1,padding:"24px 20px 40px",overflowY:"auto"}}>
        <div style={{display:"flex",background:"#F0F4F2",borderRadius:12,padding:4,marginBottom:24}}>
          {[["signup","Create Account"],["login","Log In"]].map(([m,l])=><button key={m} onClick={()=>{setMode(m);setStep(1);setErrors({});}} style={{flex:1,padding:"10px 8px",borderRadius:9,border:"none",background:mode===m?"white":"transparent",color:mode===m?C.forest:C.sub,fontWeight:mode===m?700:500,cursor:"pointer",fontSize:13,boxShadow:mode===m?"0 2px 8px rgba(0,0,0,0.08)":"none",transition:"all 0.2s"}}>{l}</button>)}
        </div>
        {mode==="login"?(
          <div>
            <h2 style={{fontSize:22,fontWeight:800,color:C.forest,margin:"0 0 6px",fontFamily:"'Playfair Display',serif"}}>Welcome back 👋</h2>
            <p style={{fontSize:13,color:C.sub,margin:"0 0 20px"}}>Log in to continue your financial journey.</p>
            <FInput label="EMAIL ADDRESS" value={form.email} onChange={v=>set("email",v)} placeholder="you@email.com" type="email" error={errors.email}/>
            <FInput label="PASSWORD" value={form.password} onChange={v=>set("password",v)} placeholder="Enter your password" type="password" error={errors.password}/>
            <button onClick={handleLogin} disabled={loading} style={{width:"100%",background:C.forest,border:"none",borderRadius:12,padding:"14px 0",color:"white",fontWeight:800,cursor:"pointer",fontSize:14,opacity:loading?0.7:1,marginTop:4}}>{loading?"Logging in...":"Log In to FinPath →"}</button>
            <div style={{textAlign:"center",marginTop:20,fontSize:13,color:C.sub}}>No account? <button onClick={()=>setMode("signup")} style={{background:"none",border:"none",color:C.jade,fontWeight:700,cursor:"pointer",fontSize:13}}>Sign up free</button></div>
            {/* Admin login hint */}
            <div style={{marginTop:20,padding:"10px 14px",background:C.amber+"18",borderRadius:10,border:`1px solid ${C.amber}44`}}>
              <div style={{fontSize:11,color:C.text,fontWeight:600,marginBottom:2}}>👑 Admin Access</div>
              <div style={{fontSize:10,color:C.sub}}>Use email: <b>admin@finpath.ng</b> with password <b>admin123</b> to access the Admin Panel</div>
            </div>
          </div>
        ):(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
              {[1,2,3].map(s=><div key={s} style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",background:step>=s?C.jade:"#E0EAE4",color:step>=s?"white":C.sub,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,transition:"all 0.3s"}}>{step>s?"✓":s}</div>{s<3&&<div style={{height:2,background:step>s?C.jade:"#E0EAE4",width:32}}/>}</div>)}
              <div style={{fontSize:12,color:C.sub,marginLeft:4}}>Step {step} of 3</div>
            </div>
            {step===1&&(
              <div>
                <h2 style={{fontSize:22,fontWeight:800,color:C.forest,margin:"0 0 4px",fontFamily:"'Playfair Display',serif"}}>Create your account</h2>
                <p style={{fontSize:13,color:C.sub,margin:"0 0 16px"}}>Get 30 days of free Premium — no card needed.</p>
                <Card style={{marginBottom:14,background:`${C.jade}15`,border:`1px solid ${C.jade}33`}}>
                  <div style={{fontSize:12,fontWeight:800,color:C.forest,marginBottom:3}}>🎁 Day 1 includes:</div>
                  <div style={{fontSize:11,color:C.jade,lineHeight:1.7}}>✓ All 35+ investments · ✓ AI Advisor · ✓ All tools · ✓ Full curriculum</div>
                </Card>
                <FInput label="FULL NAME" value={form.name} onChange={v=>set("name",v)} placeholder="e.g. Amaka Okafor" error={errors.name}/>
                <FInput label="EMAIL ADDRESS" value={form.email} onChange={v=>set("email",v)} placeholder="you@email.com" type="email" error={errors.email}/>
                <FInput label="PHONE (optional)" value={form.phone} onChange={v=>set("phone",v)} placeholder="e.g. 08012345678" type="tel"/>
                <FInput label="PASSWORD" value={form.password} onChange={v=>set("password",v)} placeholder="At least 6 characters" type="password" error={errors.password}/>
                <button onClick={()=>{if(v1())setStep(2);}} style={{width:"100%",background:C.forest,border:"none",borderRadius:12,padding:"14px 0",color:"white",fontWeight:800,cursor:"pointer",fontSize:14}}>Continue →</button>
              </div>
            )}
            {step===2&&(
              <div>
                <h2 style={{fontSize:22,fontWeight:800,color:C.forest,margin:"0 0 6px",fontFamily:"'Playfair Display',serif"}}>Tell us about yourself</h2>
                <p style={{fontSize:13,color:C.sub,margin:"0 0 16px"}}>Personalises your investment recommendations.</p>
                <div style={{marginBottom:12}}><label style={{fontSize:11,color:C.sub,fontWeight:700,display:"block",marginBottom:5}}>GRADE LEVEL</label><select value={form.gradeLevel} onChange={e=>set("gradeLevel",e.target.value)} style={selStyle(errors.gradeLevel)}><option value="">Select grade level</option>{gradeLevels.map(g=><option key={g} value={g}>{g}</option>)}</select>{errors.gradeLevel&&<div style={{fontSize:11,color:C.rose,marginTop:4}}>{errors.gradeLevel}</div>}</div>
                <FInput label="MINISTRY / AGENCY" value={form.ministry} onChange={v=>set("ministry",v)} placeholder="e.g. Federal Ministry of Finance"/>
                <div style={{marginBottom:12}}><label style={{fontSize:11,color:C.sub,fontWeight:700,display:"block",marginBottom:5}}>STATE OF POSTING</label><select value={form.state} onChange={e=>set("state",e.target.value)} style={selStyle(errors.state)}><option value="">Select state</option>{states.map(s=><option key={s} value={s}>{s}</option>)}</select>{errors.state&&<div style={{fontSize:11,color:C.rose,marginTop:4}}>{errors.state}</div>}</div>
                <div style={{display:"flex",gap:10}}><button onClick={()=>setStep(1)} style={{flex:1,background:"#F0F4F2",border:"none",borderRadius:12,padding:"13px 0",color:C.text,fontWeight:700,cursor:"pointer"}}>← Back</button><button onClick={()=>{if(v2())setStep(3);}} style={{flex:2,background:C.forest,border:"none",borderRadius:12,padding:"13px 0",color:"white",fontWeight:800,cursor:"pointer"}}>Continue →</button></div>
              </div>
            )}
            {step===3&&(
              <div>
                <h2 style={{fontSize:22,fontWeight:800,color:C.forest,margin:"0 0 6px",fontFamily:"'Playfair Display',serif"}}>Almost there! 🎉</h2>
                <Card style={{marginBottom:14}}><div style={{fontSize:12,fontWeight:700,color:C.forest,marginBottom:10}}>Account Summary</div>{[["Name",form.name],["Email",form.email],["Grade Level",form.gradeLevel||"—"],["State",form.state||"—"]].map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:8,paddingBottom:8,borderBottom:"1px solid #F4F4F4"}}><span style={{fontSize:12,color:C.sub}}>{l}</span><span style={{fontSize:12,fontWeight:600,color:C.text}}>{v}</span></div>)}</Card>
                <Card style={{marginBottom:14,border:`2px solid ${C.amber}55`,background:C.amber+"10"}}><div style={{fontWeight:800,color:C.forest,fontSize:14,marginBottom:4}}>🎁 30-Day Free Trial Included</div><div style={{fontSize:12,color:C.text,lineHeight:1.6}}>Full Pro access from Day 1. Upgrade at ₦2,500/month after trial ends.</div></Card>
                <div onClick={()=>setAgreed(!agreed)} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:14,cursor:"pointer",padding:12,borderRadius:10,background:"#F9F9F9"}}>
                  <div style={{minWidth:20,height:20,borderRadius:5,border:`2px solid ${agreed?C.jade:"#E0EAE4"}`,background:agreed?C.jade:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{agreed&&<span style={{color:"white",fontSize:11,fontWeight:700}}>✓</span>}</div>
                  <div style={{fontSize:12,color:C.text,lineHeight:1.5}}>I agree to the <span style={{color:C.jade,fontWeight:700}}>Terms of Service</span> and <span style={{color:C.jade,fontWeight:700}}>Privacy Policy</span>. This platform provides financial education and is not a licensed investment adviser.</div>
                </div>
                {errors.agreed&&<div style={{fontSize:11,color:C.rose,marginBottom:10}}>{errors.agreed}</div>}
                <div style={{display:"flex",gap:10}}><button onClick={()=>setStep(2)} style={{flex:1,background:"#F0F4F2",border:"none",borderRadius:12,padding:"13px 0",color:C.text,fontWeight:700,cursor:"pointer"}}>← Back</button><button onClick={handleSignup} disabled={loading} style={{flex:2,background:`linear-gradient(135deg,${C.forest},${C.jade})`,border:"none",borderRadius:12,padding:"13px 0",color:"white",fontWeight:800,cursor:"pointer",opacity:loading?0.7:1}}>{loading?"Creating account...":"🚀 Start My 30-Day Trial"}</button></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function MainApp({user:initialUser,onLogout}){
  const [tab,setTab]=useState("Home");
  const [user,setUser]=useState(initialUser);
  const [showTutorial,setShowTutorial]=useState(false);
  const [showUpgrade,setShowUpgrade]=useState(false);
  const [watchedIds,setWatchedIds]=useState(()=>{try{return JSON.parse(localStorage.getItem(`fp_watched_${initialUser.id}`)||"[]");}catch{return[];}});
  const trialDaysLeft=AUTH.getTrialDaysLeft(user);
  const nameRequests=AUTH.getNameRequests().filter(r=>r.userId===user.id);
  const pendingNameReq=nameRequests.find(r=>r.status==="pending");
  const isAdmin=AUTH.isAdmin(user);

  const handleUserUpdate=(updated)=>{setUser(updated);};
  const markWatched=(id)=>{const updated=[...new Set([...watchedIds,id])];setWatchedIds(updated);localStorage.setItem(`fp_watched_${user.id}`,JSON.stringify(updated));};

  const NAV=[
    {id:"Home",ico:"⊞",lbl:"Home"},
    {id:"Invest",ico:"📈",lbl:"Invest"},
    {id:"Plan",ico:"📋",lbl:"Plan"},
    {id:"Tools",ico:"🛠️",lbl:"Tools"},
    {id:"Learn",ico:"📚",lbl:"Learn"},
    {id:"AI",ico:"🤖",lbl:"Advisor"},
    ...(isAdmin?[{id:"Admin",ico:"🛡️",lbl:"Admin"}]:[]),
  ];

  const renderPage=()=>{
    switch(tab){
      case "Home":return <Dashboard user={user} onUpgrade={()=>setShowUpgrade(true)} onOpenTutorial={()=>setShowTutorial(true)} onViewProfile={()=>setTab("Profile")} setTab={setTab}/>;
      case "Invest":return <InvestSection/>;
      case "Plan":return <PlanSection/>;
      case "Tools":return <ToolsSection/>;
      case "Learn":return <LearnSection/>;
      case "AI":return <AIAdvisor/>;
      case "Profile":return <ProfileSection user={user} onUserUpdate={handleUserUpdate} onLogout={onLogout}/>;
      case "Admin":return isAdmin?<AdminPanel adminUser={user}/>:<div style={{textAlign:"center",padding:40,color:C.sub}}>Access denied.</div>;
      default:return <Dashboard user={user} onUpgrade={()=>setShowUpgrade(true)} onOpenTutorial={()=>setShowTutorial(true)} onViewProfile={()=>setTab("Profile")} setTab={setTab}/>;
    }
  };

  return(
    <div style={{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:C.cream,minHeight:"100vh",maxWidth:560,margin:"0 auto"}}>
      <div style={{background:C.forest,padding:"14px 20px 12px",position:"sticky",top:0,zIndex:100,boxShadow:"0 4px 20px rgba(11,61,46,0.35)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button onClick={()=>setTab("Home")} style={{background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"white",fontWeight:800}}>FinPath<span style={{color:C.amber}}>.</span></div>
            <div style={{fontSize:8,color:C.mint,fontWeight:700,letterSpacing:2.5,textTransform:"uppercase"}}>Nigeria</div>
          </button>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {trialDaysLeft>0&&<div style={{background:C.amber+"33",borderRadius:20,padding:"4px 10px",fontSize:10,fontWeight:700,color:C.amber,border:`1px solid ${C.amber}55`}}>🎁 {trialDaysLeft}d</div>}
            {pendingNameReq&&<div style={{background:C.rose+"33",borderRadius:20,padding:"4px 10px",fontSize:9,fontWeight:700,color:"#FFB3B3",border:`1px solid ${C.rose}44`}}>⏳ Name review</div>}
            <NotificationBell user={user} watchedIds={watchedIds} onOpenTutorial={()=>setShowTutorial(true)} trialDaysLeft={trialDaysLeft} nameRequests={nameRequests}/>
            <button onClick={()=>setTab("Profile")} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>
              <Avatar user={user} size={32} fontSize={13}/>
            </button>
          </div>
        </div>
      </div>
      <div style={{padding:"18px 16px 110px"}}>{renderPage()}</div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:560,background:"white",borderTop:"1px solid #E0EAE4",display:"flex",boxShadow:"0 -4px 20px rgba(0,0,0,0.08)"}}>
        {NAV.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 2px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            {t.id==="Profile"?<Avatar user={user} size={18} fontSize={8}/>:<div style={{fontSize:14}}>{t.ico}</div>}
            <div style={{fontSize:8,fontWeight:tab===t.id?700:500,color:tab===t.id?C.jade:C.sub}}>{t.lbl}</div>
            {tab===t.id&&<div style={{width:3,height:3,background:C.jade,borderRadius:"50%"}}/>}
          </button>
        ))}
      </div>
      {showTutorial&&<TutorialModal user={user} onClose={()=>setShowTutorial(false)} onMarkWatched={markWatched} watchedIds={watchedIds}/>}
      {showUpgrade&&<UpgradeModal onClose={()=>setShowUpgrade(false)}/>}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function FinPath(){
  const [screen,setScreen]=useState("landing");
  const [authMode,setAuthMode]=useState("signup");
  const [user,setUser]=useState(()=>AUTH.getSession());

  useEffect(()=>{
    // Seed admin account
    const users=AUTH.getUsers();
    if(!users.find(u=>u.email==="admin@finpath.ng")){
      const admin={id:"admin_001",name:"FinPath Admin",email:"admin@finpath.ng",password:"admin123",phone:"",gradeLevel:"Admin",ministry:"FinPath Nigeria",state:"FCT",plan:"pro",isAdmin:true,avatar:"A",avatarImg:null,joinedAt:new Date().toISOString(),trialStart:Date.now()};
      AUTH.saveUsers([...users,admin]);
    }
    if(user)setScreen("app");
  },[]);

  const handleAuth=(u)=>{setUser(u);setScreen("app");};
  const handleLogout=()=>{AUTH.clearSession();setUser(null);setScreen("landing");};

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0B3D2E;}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        input:focus,select:focus,textarea:focus{border-color:#1A6B4A!important;box-shadow:0 0 0 3px #1A6B4A22!important;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#1A6B4A44;border-radius:2px;}
        select{cursor:pointer;}textarea{font-family:'DM Sans',sans-serif;}
      `}</style>
      {screen==="landing"&&<LandingPage onGetStarted={()=>{setAuthMode("signup");setScreen("auth");}} onLogin={()=>{setAuthMode("login");setScreen("auth");}}/>}
      {screen==="auth"&&<AuthScreen mode={authMode} onAuth={handleAuth} onBack={()=>setScreen("landing")}/>}
      {screen==="app"&&user&&<MainApp user={user} onLogout={handleLogout}/>}
    </>
  );
}
