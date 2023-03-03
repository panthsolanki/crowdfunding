import './App.css';
import idl from './idl.json';
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, AnchorProvider, web3, utils, BN } from "@project-serum/anchor";
import { useEffect, useState } from 'react';
import { Buffer } from "buffer";

window.Buffer = Buffer;
const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl("devnet");
const opts = {
  preflightCommitment: "processed",
}
const { SystemProgram } = web3;

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment)
    const provider = new AnchorProvider(connection, window.solana, opts.preflightCommitment)
    return provider;
  }

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;
      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');
          const response = await solana.connect({
            onlyIfTrusted: true,
          });
          console.log('response ==>', response);
          setWalletAddress(response.publicKey.toString())
        }
      } else {
        alert("Solana object not found! Get some Phantom wallet")
      }
    } catch (error) {
      console.log(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;
    if (solana) {
      const response = await solana.connect();
      console.log('response ==>', response);
      setWalletAddress(response.publicKey.toString());
    } else {
      alert("Solana object not found! Get some Phantom wallet")
    }
  }

  const createCampaign = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const [campaign] = await PublicKey.findProgramAddressSync(
        [
          utils.bytes.utf8.encode("CAMPAIGN_DEMO"),
          provider.wallet.publicKey.toBuffer(),
        ],
        program.programId
      );
      await program.rpc.create("campaign name", "campaign description", {
        accounts: {
          campaign,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        },
      });
      console.log("Create a new campaign with address ", campaign.toString());
    } catch (error) {
      console.log('Error creating campaign account ', error);
    }
  };

  const renderConnectedWallet = () => {
    return <button onClick={createCampaign}>create Campaign</button>
  };

  const renderNotConnectedWallet = () => {
    return <button onClick={connectWallet}>Connect to Wallet</button>
  };

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    }
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return (<div className='App'>
    {!walletAddress && renderNotConnectedWallet()}
    {walletAddress && renderConnectedWallet()}
  </div>)
}

export default App;
