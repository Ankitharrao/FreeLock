import { useState } from "react"
import { ethers } from "ethers"

const CONTRACT_ADDRESS = "0xd2Ef73d11247AaC4E17585386756612f7084F5e1"

const ABI = [
  "function contractCount() view returns (uint256)",
  "function createContract(address,address,uint256,string,string) returns (uint256)",
  "function fundEscrow(uint256) payable",
  "function submitWork(uint256,string)",
  "function approveWork(uint256)",
  "function raiseDispute(uint256,string)",
  "function contracts(uint256) view returns (uint256,address,address,address,uint256,uint256,string,string,uint8,string,string,uint256)",
  "function getClientContracts(address) view returns (uint256[])",
  "function getFreelancerContracts(address) view returns (uint256[])",
]

const STATUS = ["OPEN", "FUNDED", "SUBMITTED", "APPROVED", "DISPUTED", "RESOLVED", "CANCELLED"]

const STATUS_COLOR = {
  OPEN:      { bg: "#2a2a3e", color: "#a78bfa" },
  FUNDED:    { bg: "#1a3a2a", color: "#34d399" },
  SUBMITTED: { bg: "#3a2a1a", color: "#fb923c" },
  APPROVED:  { bg: "#1a3a2a", color: "#34d399" },
  DISPUTED:  { bg: "#3a1a1a", color: "#f87171" },
  RESOLVED:  { bg: "#1a2a3a", color: "#60a5fa" },
  CANCELLED: { bg: "#2a2a2a", color: "#9ca3af" },
}

export default function App() {
  const [account, setAccount] = useState(null)
  const [contract, setContract] = useState(null)
  const [status, setStatus] = useState("")
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState("client")
  const [showForm, setShowForm] = useState(false)

  const [freelancer, setFreelancer] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [deadline, setDeadline] = useState("")
  const [amount, setAmount] = useState("")

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask!")
        return
      }
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      })
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const escrowContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer)
      setAccount(address)
      setContract(escrowContract)
      setStatus("Connected to Sepolia!")
    } catch (err) {
      setStatus("Error: " + err.message)
    }
  }

  const createJob = async () => {
    try {
      setLoading(true)
      setStatus("Creating contract on blockchain...")
      const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000)
      const tx = await contract.createContract(
        freelancer, ethers.ZeroAddress, deadlineTimestamp, title, description
      )
      setStatus("⏳ Waiting for confirmation...")
      await tx.wait()
      setStatus("✅ Job contract created!")
      setShowForm(false)
      setFreelancer(""); setTitle(""); setDescription(""); setDeadline(""); setAmount("")
      loadJobs()
    } catch (err) {
      setStatus("Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const fundJob = async (id, amt) => {
    try {
      setLoading(true)
      setStatus("Locking ETH in escrow...")
      const tx = await contract.fundEscrow(id, { value: ethers.parseEther(amt) })
      setStatus("⏳ Waiting for confirmation...")
      await tx.wait()
      setStatus("✅ Escrow funded! ETH is locked.")
      loadJobs()
    } catch (err) {
      setStatus("Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const submitWork = async (id) => {
    try {
      setLoading(true)
      setStatus("Submitting work...")
      const tx = await contract.submitWork(id, "Work completed! Check delivery.")
      setStatus("⏳ Waiting for confirmation...")
      await tx.wait()
      setStatus("✅ Work submitted!")
      loadJobs()
    } catch (err) {
      setStatus("Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const approveJob = async (id) => {
    try {
      setLoading(true)
      setStatus("Approving and releasing payment...")
      const tx = await contract.approveWork(id)
      setStatus("⏳ Waiting for confirmation...")
      await tx.wait()
      setStatus("✅ Payment released to freelancer!")
      loadJobs()
    } catch (err) {
      setStatus("Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadJobs = async () => {
    try {
      setStatus("Loading jobs...")
      const ids = role === "client"
        ? await contract.getClientContracts(account)
        : await contract.getFreelancerContracts(account)
      const jobList = []
      for (let i = 0; i < ids.length; i++) {
        const j = await contract.contracts(ids[i])
        jobList.push({
          id: Number(j[0]),
          client: j[1],
          freelancer: j[2],
          amount: ethers.formatEther(j[4]),
          title: j[6],
          description: j[7],
          status: STATUS[Number(j[8])],
        })
      }
      setJobs(jobList)
      setStatus("✅ Jobs loaded!")
    } catch (err) {
      setStatus("Error: " + err.message)
    }
  }

  const shortAddr = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ""

  const s = {
    page: { minHeight: "100vh", background: "#1a1a2e", color: "#e0e0e0", fontFamily: "'Segoe UI', Arial, sans-serif" },
    nav: { background: "#16213e", borderBottom: "1px solid #2a2a4a", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 },
    navLogo: { fontSize: 22, fontWeight: "bold", color: "#f6851b", letterSpacing: 1 },
    navRight: { display: "flex", alignItems: "center", gap: 12 },
    badge: { background: "#2a2a4a", border: "1px solid #3a3a6a", borderRadius: 20, padding: "6px 14px", fontSize: 13, color: "#a0a0c0" },
    networkBadge: { background: "#1a3a2a", border: "1px solid #34d399", borderRadius: 20, padding: "6px 14px", fontSize: 12, color: "#34d399" },
    body: { maxWidth: 860, margin: "0 auto", padding: "32px 20px" },
    connectBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 24 },
    connectCard: { background: "#16213e", border: "1px solid #2a2a4a", borderRadius: 20, padding: 48, textAlign: "center", maxWidth: 400, width: "100%" },
    foxEmoji: { fontSize: 64, marginBottom: 16 },
    connectTitle: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 8 },
    connectSub: { color: "#7a7a9a", fontSize: 14, marginBottom: 32 },
    btnOrange: { background: "linear-gradient(135deg, #f6851b, #e2761b)", color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontSize: 16, fontWeight: "bold", cursor: "pointer", width: "100%" },
    statusBar: { background: "#16213e", border: "1px solid #2a2a4a", borderRadius: 10, padding: "10px 16px", marginBottom: 20, fontSize: 13, color: "#a0c0ff", display: "flex", alignItems: "center", gap: 8 },
    roleBar: { display: "flex", gap: 8, marginBottom: 24 },
    roleBtn: (active, color) => ({
      padding: "10px 24px", borderRadius: 10, border: `1px solid ${active ? color : "#2a2a4a"}`,
      background: active ? color + "22" : "#16213e", color: active ? color : "#7a7a9a",
      cursor: "pointer", fontSize: 14, fontWeight: active ? "bold" : "normal", transition: "all 0.2s"
    }),
    card: { background: "#16213e", border: "1px solid #2a2a4a", borderRadius: 16, padding: 24, marginBottom: 20 },
    cardTitle: { fontSize: 16, fontWeight: "bold", color: "#fff", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 },
    input: { width: "100%", background: "#0d1117", border: "1px solid #2a2a4a", borderRadius: 10, padding: "12px 14px", color: "#e0e0e0", fontSize: 14, marginBottom: 12, boxSizing: "border-box", outline: "none" },
    btnPrimary: { background: "linear-gradient(135deg, #f6851b, #e2761b)", color: "white", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: "bold", cursor: "pointer", marginRight: 8 },
    btnSecondary: { background: "#2a2a4a", color: "#a0a0c0", border: "1px solid #3a3a6a", borderRadius: 10, padding: "12px 24px", fontSize: 14, cursor: "pointer", marginRight: 8 },
    btnGreen: { background: "#065f4622", color: "#34d399", border: "1px solid #34d399", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: "bold", cursor: "pointer", marginRight: 8 },
    btnRed: { background: "#7f1d1d22", color: "#f87171", border: "1px solid #f87171", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer" },
    btnBlue: { background: "#1e3a5f22", color: "#60a5fa", border: "1px solid #60a5fa", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: "bold", cursor: "pointer" },
    jobCard: { background: "#0d1117", border: "1px solid #2a2a4a", borderRadius: 12, padding: 20, marginBottom: 12 },
    jobHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
    jobTitle: { fontSize: 16, fontWeight: "bold", color: "#fff" },
    statusPill: (s) => ({ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: "bold", background: STATUS_COLOR[s]?.bg, color: STATUS_COLOR[s]?.color }),
    jobMeta: { fontSize: 12, color: "#5a5a7a", marginBottom: 4 },
    jobAmount: { fontSize: 20, fontWeight: "bold", color: "#f6851b", marginBottom: 16 },
    divider: { borderTop: "1px solid #2a2a4a", margin: "16px 0" },
    addBtn: { background: "transparent", border: "1px dashed #f6851b", color: "#f6851b", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer" },
    inlineInput: { background: "#0d1117", border: "1px solid #2a2a4a", borderRadius: 8, padding: "8px 12px", color: "#e0e0e0", fontSize: 13, width: 120, marginRight: 8, outline: "none" },
  }

  return (
    <div style={s.page}>
      {/* Navbar */}
      <nav style={s.nav}>
        <div style={s.navLogo}>🦊 FreeLock</div>
        {account && (
          <div style={s.navRight}>
            <span style={s.networkBadge}>● Sepolia</span>
            <span style={s.badge}>{shortAddr(account)}</span>
          </div>
        )}
      </nav>

      <div style={s.body}>
        {/* Status bar */}
        {status && <div style={s.statusBar}>⚡ {status}</div>}

        {!account ? (
          /* Connect Screen */
          <div style={s.connectBox}>
            <div style={s.connectCard}>
              <div style={s.foxEmoji}>🦊</div>
              <div style={s.connectTitle}>Welcome to FreeLock</div>
              <div style={s.connectSub}>
                Trustless freelance agreements powered by blockchain. Connect your wallet to get started.
              </div>
              <button onClick={connectWallet} style={s.btnOrange}>
                Connect MetaMask
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Role Switcher */}
            <div style={s.roleBar}>
              <button style={s.roleBtn(role === "client", "#f6851b")}
                onClick={() => { setRole("client"); setJobs([]) }}>
                👔 Client
              </button>
              <button style={s.roleBtn(role === "freelancer", "#a78bfa")}
                onClick={() => { setRole("freelancer"); setJobs([]) }}>
                🧑‍💻 Freelancer
              </button>
            </div>

            {/* Create Job */}
            {role === "client" && (
              <div style={s.card}>
                <div style={s.cardTitle}>📝 New Job Contract</div>
                {!showForm ? (
                  <button style={s.addBtn} onClick={() => setShowForm(true)}>
                    + Create New Contract
                  </button>
                ) : (
                  <>
                    <input style={s.input} placeholder="Freelancer wallet address (0x...)"
                      value={freelancer} onChange={e => setFreelancer(e.target.value)} />
                    <input style={s.input} placeholder="Job title"
                      value={title} onChange={e => setTitle(e.target.value)} />
                    <input style={s.input} placeholder="Description"
                      value={description} onChange={e => setDescription(e.target.value)} />
                    <input style={s.input} type="date"
                      value={deadline} onChange={e => setDeadline(e.target.value)} />
                    <input style={s.input} placeholder="Amount in ETH (e.g. 0.01)"
                      value={amount} onChange={e => setAmount(e.target.value)} />
                    <button onClick={createJob} style={s.btnPrimary} disabled={loading}>
                      {loading ? "Processing..." : "🔒 Deploy Contract"}
                    </button>
                    <button onClick={() => setShowForm(false)} style={s.btnSecondary}>
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Jobs List */}
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={s.cardTitle}>
                  {role === "client" ? "💼 My Contracts" : "🧑‍💻 Assigned Jobs"}
                </div>
                <button onClick={loadJobs} style={s.btnSecondary}>
                  🔄 Refresh
                </button>
              </div>

              {jobs.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#3a3a5a" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
                  <div>No jobs found. {role === "client" ? "Create one above!" : "Ask your client to assign you a job."}</div>
                </div>
              ) : (
                jobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    role={role}
                    s={s}
                    loading={loading}
                    onFund={(amt) => fundJob(job.id, amt)}
                    onSubmit={() => submitWork(job.id)}
                    onApprove={() => approveJob(job.id)}
                    onDispute={() => contract.raiseDispute(job.id, "Not satisfied")}
                    shortAddr={shortAddr}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function JobCard({ job, role, s, loading, onFund, onSubmit, onApprove, onDispute, shortAddr }) {
  const [fundAmt, setFundAmt] = useState("")

  return (
    <div style={s.jobCard}>
      <div style={s.jobHeader}>
        <div>
          <div style={s.jobTitle}>{job.title}</div>
          <div style={{ ...s.jobMeta, marginTop: 4 }}>{job.description}</div>
        </div>
        <span style={s.statusPill(job.status)}>{job.status}</span>
      </div>

      <div style={s.jobAmount}>{job.amount} ETH</div>

      <div style={s.jobMeta}>
        {role === "client" ? `🧑‍💻 Freelancer: ${shortAddr(job.freelancer)}` : `👔 Client: ${shortAddr(job.client)}`}
      </div>
      <div style={s.jobMeta}>🔖 Contract ID: #{job.id}</div>

      <div style={s.divider} />

      {/* Actions */}
      {role === "client" && job.status === "OPEN" && (
        <div style={{ display: "flex", alignItems: "center" }}>
          <input
            style={s.inlineInput}
            placeholder="ETH amount"
            value={fundAmt}
            onChange={e => setFundAmt(e.target.value)}
          />
          <button onClick={() => onFund(fundAmt)} style={s.btnGreen} disabled={loading}>
            🔒 Fund Escrow
          </button>
        </div>
      )}

      {role === "client" && job.status === "SUBMITTED" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onApprove} style={s.btnGreen} disabled={loading}>
            ✅ Approve & Release
          </button>
          <button onClick={onDispute} style={s.btnRed} disabled={loading}>
            ⚠️ Dispute
          </button>
        </div>
      )}

      {role === "freelancer" && job.status === "FUNDED" && (
        <button onClick={onSubmit} style={s.btnBlue} disabled={loading}>
          📤 Submit Work
        </button>
      )}

      {job.status === "APPROVED" && (
        <div style={{ color: "#34d399", fontSize: 13, fontWeight: "bold" }}>
          🎉 Payment released! Contract complete.
        </div>
      )}

      {job.status === "CANCELLED" && (
        <div style={{ color: "#9ca3af", fontSize: 13 }}>
          ❌ Contract cancelled.
        </div>
      )}
    </div>
  )
}