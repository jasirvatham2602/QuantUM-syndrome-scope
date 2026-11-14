"""Run the SyndromeScope repetition-code lab with Qiskit Aer."""

import json
import sys

from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
from qiskit_aer import AerSimulator


PREDICTIONS = {
    "00": "No bit-flip error",
    "10": "Data qubit q0 flipped",
    "11": "Data qubit q1 flipped",
    "01": "Data qubit q2 flipped",
}


def build_circuit(logical_state, error_qubit):
    data = QuantumRegister(3, "data")
    ancilla = QuantumRegister(2, "check")
    syndrome = ClassicalRegister(2, "syndrome")
    circuit = QuantumCircuit(data, ancilla, syndrome)

    # Encode alpha|0> + beta|1> as alpha|000> + beta|111>.
    if logical_state == "one":
        circuit.x(data[0])
    elif logical_state == "plus":
        circuit.h(data[0])
    circuit.cx(data[0], data[1])
    circuit.cx(data[0], data[2])
    circuit.barrier()

    if error_qubit != "none":
        circuit.x(data[int(error_qubit)])
    circuit.barrier()

    # Two stabilizer checks: Z0Z1 and Z1Z2. Ancillas reveal parity,
    # while the encoded logical value remains unmeasured.
    circuit.cx(data[0], ancilla[0])
    circuit.cx(data[1], ancilla[0])
    circuit.cx(data[1], ancilla[1])
    circuit.cx(data[2], ancilla[1])
    circuit.measure(ancilla[0], syndrome[0])
    circuit.measure(ancilla[1], syndrome[1])
    return circuit


def run_experiment(request):
    logical_state = request["logicalState"]
    error_qubit = request["errorQubit"]
    shots = request["shots"]
    circuit = build_circuit(logical_state, error_qubit)
    raw_counts = AerSimulator().run(circuit, shots=shots).result().get_counts()

    # Qiskit prints classical bits from high to low, so reverse them to show
    # the checks in UI order: [Z0Z1, Z1Z2].
    counts = {key.replace(" ", "")[::-1]: value for key, value in raw_counts.items()}
    dominant = max(counts, key=counts.get)
    return {
        "engine": "Qiskit AerSimulator",
        "qiskitVersion": __import__("qiskit").__version__,
        "logicalState": logical_state,
        "errorQubit": error_qubit,
        "shots": shots,
        "counts": counts,
        "dominantSyndrome": dominant,
        "prediction": PREDICTIONS[dominant],
        "confidence": counts[dominant] / shots,
        "checks": [
            {"name": "Z0Z1", "value": int(dominant[0])},
            {"name": "Z1Z2", "value": int(dominant[1])},
        ],
        "circuit": str(circuit.draw(output="text")),
    }


if __name__ == "__main__":
    try:
        payload = json.loads(sys.argv[1])
        print(json.dumps(run_experiment(payload)))
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
