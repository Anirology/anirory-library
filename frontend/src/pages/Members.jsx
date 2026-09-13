import { useMemo, useState } from 'react'
import { Eye, Search, UserPlus, Users } from 'lucide-react'

const INITIAL_MEMBERS = [
  { id: 'MB-1042', name: 'Nadeesha Perera', type: 'Adult', loans: 2, standing: 'Good' },
  { id: 'MB-1038', name: 'Kavindu Silva', type: 'Student', loans: 4, standing: 'Good' },
  { id: 'MB-1027', name: 'Imani Fernando', type: 'Researcher', loans: 7, standing: 'Review' },
  { id: 'MB-1019', name: 'Aarav Jayasinghe', type: 'Senior', loans: 0, standing: 'Good' },
]

export default function Members({ onAdd, notify }) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const shown = useMemo(() => INITIAL_MEMBERS.filter((m) => (!type || m.type === type) && `${m.name} ${m.id}`.toLowerCase().includes(search.toLowerCase())), [search, type])
  return <div className="page page-enter"><header className="page-header"><div><span className="eyebrow">Patron services</span><h1>Members</h1><p>Review member activity and account standing.</p></div><button className="button primary ripple" onClick={onAdd}><UserPlus aria-hidden="true" />Add member</button></header>
    <section className="filters-panel member-filters glass"><label className="search-field"><Search aria-hidden="true" /><span className="sr-only">Search members</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or member ID" /></label><label><span>Member type</span><select value={type} onChange={(e) => setType(e.target.value)}><option value="">All member types</option><option>Adult</option><option>Student</option><option>Researcher</option><option>Senior</option></select></label></section>
    <section className="table-panel glass"><div className="section-heading"><div><span className="eyebrow">Active directory</span><h2>{shown.length} members shown</h2></div></div><div className="responsive-table"><table><thead><tr><th>Member</th><th>Type</th><th>Active loans</th><th>Account standing</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{shown.map((member) => <tr key={member.id}><td><b>{member.name}</b><small>{member.id}</small></td><td>{member.type}</td><td>{member.loans}</td><td><span className={`status ${member.standing === 'Good' ? 'available' : 'warning'}`}>{member.standing}</span></td><td><button className="button secondary small ripple" onClick={() => notify(`${member.name} selected. Full member persistence is planned for the next module.`)}><Eye aria-hidden="true" />View member</button></td></tr>)}</tbody></table>{!shown.length && <div className="empty-table"><Users aria-hidden="true" />No matching members</div>}</div></section>
  </div>
}

