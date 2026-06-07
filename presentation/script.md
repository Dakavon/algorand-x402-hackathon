# Presenter Script

Target: 5 to 6 slides, then live demo after slide 5, then close with slide 6.

## Slide 1 · P2P Agentic Energy Sharing

Your EV is no longer just a vehicle. It is a machine customer.

Our demo is simple: the EV finds surplus solar from a neighbour, pays per kilowatt-hour through x402 on Algorand, and charges while the user is asleep.

The important part is that this is not only a simulated payment row. The agent settles real EURD on Algorand mainnet, and each payment has a Lora transaction link.

We submit primarily to Agentic Commerce. We also apply to the Quantoz and Alpha Arcade bonus tracks where the extensions fit the product roadmap.

## Slide 2 · Section 42c EnWG

This is the legal wedge.

Germany's §42c EnWG now describes regulated sharing of renewable electricity. It explicitly allows remuneration in cents per kilowatt-hour, including for renewable-only storage under the statute's constraints.

So the question is not only whether households may share energy. The question is how this becomes usable by machines: how offers are priced, how an EV decides, how payment is settled, and how proof is shown.

## Slide 3 · Why This Exists

The market context is that electricity coordination is brittle and local surplus is still hard to use.

On 25 June 2024, Germany's day-ahead auction cleared near EUR 492 per megawatt-hour while France cleared near EUR 2.96. We are not claiming to replace wholesale markets. The point is that centralized coordination failures create extreme local differences.

At household scale, the problem is more basic: solar surplus exists, but matching, pricing, authorization, settlement, and proof are still manual.

Our layer automates that local remuneration flow.

## Slide 4 · Built In The Hackathon Window

The system has four parts.

The producer is a Raspberry Pi simulating a solar household. It reads hardware state, computes surplus, prices energy, and releases delivery.

The seller server exposes energy as an x402-protected HTTP resource.

The EV agent is the buyer. It checks charger state, price, budget, and max-price policy, then signs the payment and re-buys in metered chunks.

The mobile app is only the customer surface. It starts and stops the session and shows state, reasoning, wallet balance, and Lora proof. It does not sign payments.

## Slide 5 · Why Crypto, Algorand, And x402

Visa and SEPA are not designed for this. They are human checkout and reconciliation rails, and their fee model makes repeated tiny payments uneconomic. A sleeping EV should not store card credentials, wait for banking settlement, or create a fee and reconciliation event for every charging chunk.

Crypto is useful here because autonomous machines need direct final settlement, programmable spend limits, and micropayment economics that still work below one euro. In our demo, the chunks are small enough that card or banking rails would not make sense operationally.

x402 fits because the resource is already HTTP-native. The EV requests energy, the server returns `402 Payment Required`, the agent attaches payment, and the server grants delivery.

Algorand fits because low fees, fast finality, ASA support, the GoPlausible facilitator, and Lora explorer proof make per-kWh settlement practical.

EURD and EURQ fit because energy is priced in cents per kilowatt-hour. A regulated euro-denominated asset avoids the card-network fee model while remaining easier to explain to households than a volatile token.

At this point, go into the live demo.

## Live Demo · Between Slides 5 And 6

Show the mobile app and the hardware.

1. Show that the charger is connected.
2. Set a small chunk size, budget, and max price.
3. Start charging.
4. Narrate the state transition: evaluating, paying, charging.
5. Show the payment row appear.
6. Click the Lora link and show the mainnet EURD transaction.
7. Return to the app and show session totals or wallet balance.
8. Stop charging and point out that the Pi is notified.

Key line during demo:

The credibility anchor is the explorer link. The agent is not pretending to pay; it is settling a regulated euro-denominated asset on Algorand mainnet.

If the live network is slow, use the prepared recording and say:

This is the same flow from the rehearsal run. We keep the recording because the settlement path depends on mainnet and the facilitator, but the transaction links remain verifiable.

## Slide 6 · Delivered Now, Marketplace Next

The hackathon milestone proves the hard loop: one hardware-backed seller, one autonomous EV buyer, x402 settlement, and real EURD on mainnet.

The second milestone is the marketplace.

For Quantoz, EURD is already live, and EURQ is the production upgrade path.

For Alpha Arcade, sellers publish future surplus, price, and confidence. That data can become a forward market: will this grid area have cheap solar tomorrow.

The closing line:

Alpha prices uncertainty, Quantoz provides regulated euro settlement, and x402 settles actual delivery.
