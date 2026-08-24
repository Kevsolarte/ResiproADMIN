"""Seeds coherent demo data through the API, so the Go hooks compute the
cached dates exactly as they would in real use.
Carga datos de demo coherentes a través de la API, así los hooks de Go calculan
las fechas cacheadas igual que en uso real.

    python scripts/seed.py --email you@example.com --password yourpass
    python scripts/seed.py --email ... --password ... --reset

--reset wipes the four collections first. Without it, the demo data is added
on top of whatever is already there.
--reset borra antes las cuatro collections. Sin eso, los datos de demo se
suman a lo que ya haya.
"""

import argparse
import json
import sys
import urllib.error
import urllib.request

BASE_URL = "http://127.0.0.1:8090"

# Every date is relative to this reference so the payment states stay put:
# "Atrasado" / "Esta semana" / "Proximo" are computed from today.
# Todas las fechas cuelgan de esta referencia para que los estados no se
# muevan: "Atrasado" / "Esta semana" / "Proximo" se calculan contra hoy.
COLLABORATORS = [
    {"name": "Valentina Rios", "email": "valentina@resiproco.com", "role": "Design"},
    {"name": "Mateo Herrera", "email": "mateo@resiproco.com", "role": "Developer"},
    {"name": "Camila Duarte", "email": "camila@resiproco.com", "role": "Marketing"},
    {"name": "Tomas Lagos", "email": "tomas@resiproco.com", "role": "Freelancer"},
]

PROJECTS = [
    {
        "key": "aurora",
        "name": "Portal Aurora",
        "client": "Aurora Cafe",
        "type": "Full Website",
        "status": "In progress",
        "is_monthly": True,
        "collaborator": "Valentina Rios",
        "collaborator_payment_mode": "Hourly",
        "collaborator_amount": 45,
        # next_payment -> 2026-08-10: ATRASADO
        "incomes": [("2026-05-10", 1200), ("2026-06-10", 1200), ("2026-07-10", 1200)],
        # collaborator_next_payment -> 2026-08-16: ATRASADO
        "payments": [("2026-07-18", 540), ("2026-08-01", 540)],
    },
    {
        "key": "nordika",
        "name": "Tienda Nordika",
        "client": "Nordika",
        "type": "E-Commerce",
        "status": "In progress",
        "is_monthly": True,
        "collaborator": "Mateo Herrera",
        "collaborator_payment_mode": "Hourly",
        "collaborator_amount": 60,
        # next_payment -> 2026-08-28: ESTA SEMANA
        "incomes": [("2026-06-28", 2400), ("2026-07-28", 2400)],
        # collaborator_next_payment -> 2026-08-29: ESTA SEMANA
        "payments": [("2026-07-30", 900), ("2026-08-14", 900)],
    },
    {
        "key": "sialtec",
        "name": "Rebranding Sialtec",
        "client": "Sialtec",
        "type": "Graphic Identity",
        "status": "In progress",
        "is_monthly": False,
        # Same person as Portal Aurora, different agreement. This is the pair
        # that proves why the agreement belongs to the project.
        # La misma persona que Portal Aurora, con otro acuerdo. Este es el par
        # que prueba por que el acuerdo es del proyecto.
        "collaborator": "Valentina Rios",
        "collaborator_payment_mode": "Per project",
        "collaborator_amount": 1500,
        # Not monthly -> no next_payment. Per project -> no collaborator date.
        # No es mensual -> sin next_payment. Per project -> sin fecha.
        "incomes": [("2026-08-05", 1800)],
        # 2100 out vs 1800 in: the only negative margin, shown in red.
        # 2100 afuera contra 1800 adentro: el unico margen negativo, en rojo.
        "payments": [("2026-07-20", 1200), ("2026-08-05", 900)],
    },
    {
        "key": "mirador",
        "name": "Blog Mirador",
        "client": "Mirador",
        "type": "Blog Site",
        "status": "In progress",
        "is_monthly": True,
        "collaborator": "Mateo Herrera",
        "collaborator_payment_mode": "Hourly",
        "collaborator_amount": 40,
        # next_payment -> 2026-09-15: PROXIMO
        "incomes": [("2026-08-15", 700)],
        # collaborator_next_payment -> 2026-09-06: PROXIMO
        "payments": [("2026-08-22", 400)],
    },
    {
        "key": "vertice",
        "name": "Landing Vertice",
        "client": "Vertice Legal",
        "type": "Landing Page",
        "status": "Completed",
        "is_monthly": False,
        "collaborator": "Camila Duarte",
        "collaborator_payment_mode": "Per project",
        "collaborator_amount": 600,
        "incomes": [("2026-08-15", 900)],
        "payments": [("2026-08-15", 600)],
    },
    {
        "key": "kappa",
        "name": "Auditoria Kappa",
        "client": "Kappa Industrial",
        "type": "Web Audit",
        "status": "Completed",
        "is_monthly": False,
        "collaborator": "Camila Duarte",
        "collaborator_payment_mode": "Per project",
        "collaborator_amount": 400,
        "incomes": [("2026-04-12", 800)],
        "payments": [("2026-04-12", 400)],
        # Archived: shows the toggle, and that history keeps naming it.
        # Archivado: muestra el toggle, y que el historial lo sigue nombrando.
        "archived": True,
    },
]

COLLECTIONS = ["incomes", "collaborator_payments", "projects", "collaborators"]


def request(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", token)

    try:
        with urllib.request.urlopen(req) as response:
            raw = response.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode()
        raise SystemExit(f"  {method} {path} -> {error.code}\n  {detail}")
    except urllib.error.URLError:
        raise SystemExit("  No hay respuesta en 8090. Levanta el backend: go run . serve")


def authenticate(email, password):
    result = request(
        "POST",
        "/api/collections/_superusers/auth-with-password",
        body={"identity": email, "password": password},
    )
    return result["token"]


def to_pb_date(value):
    """PocketBase stores dates as 'YYYY-MM-DD HH:MM:SS.mmmZ'."""
    return f"{value} 00:00:00.000Z"


def reset(token):
    for collection in COLLECTIONS:
        result = request(
            "GET", f"/api/collections/{collection}/records?perPage=500", token
        )
        for record in result["items"]:
            request(
                "DELETE", f"/api/collections/{collection}/records/{record['id']}", token
            )
        print(f"  {collection}: {len(result['items'])} borrados")


def seed(token):
    collaborator_ids = {}
    for collaborator in COLLABORATORS:
        created = request(
            "POST", "/api/collections/collaborators/records", token, collaborator
        )
        collaborator_ids[collaborator["name"]] = created["id"]
    print(f"  {len(collaborator_ids)} colaboradores")

    for project in PROJECTS:
        collaborator_id = collaborator_ids[project["collaborator"]]

        created = request(
            "POST",
            "/api/collections/projects/records",
            token,
            {
                "name": project["name"],
                "client": project["client"],
                "type": project["type"],
                "status": project["status"],
                "is_monthly": project["is_monthly"],
                "collaborator": collaborator_id,
                "collaborator_payment_mode": project["collaborator_payment_mode"],
                "collaborator_amount": project["collaborator_amount"],
            },
        )
        project_id = created["id"]

        for date, amount in project["incomes"]:
            request(
                "POST",
                "/api/collections/incomes/records",
                token,
                {"project": project_id, "amount": amount, "date": to_pb_date(date)},
            )

        for date, amount in project["payments"]:
            request(
                "POST",
                "/api/collections/collaborator_payments/records",
                token,
                {
                    "project": project_id,
                    "collaborator": collaborator_id,
                    "amount": amount,
                    "date": to_pb_date(date),
                },
            )

        # Archived last, so the hooks ran on a normal project first.
        # Archivado al final, para que los hooks corrieran sobre un proyecto normal.
        if project.get("archived"):
            request(
                "PATCH",
                f"/api/collections/projects/records/{project_id}",
                token,
                {"archived": True},
            )

        income_total = sum(amount for _, amount in project["incomes"])
        payment_total = sum(amount for _, amount in project["payments"])
        flag = " [archivado]" if project.get("archived") else ""
        print(
            f"  {project['name']:<20} margen {income_total - payment_total:>+6}{flag}"
        )


def summarise(token):
    result = request("GET", "/api/collections/projects/records?perPage=500", token)
    print()
    print("  proyecto              proximo cobro   proximo pago")
    print("  " + "-" * 52)
    for record in sorted(result["items"], key=lambda r: r["name"]):
        income_date = (record["next_payment"] or "-")[:10]
        payment_date = (record["collaborator_next_payment"] or "-")[:10]
        print(f"  {record['name']:<20}  {income_date:<14}  {payment_date}")


def main():
    parser = argparse.ArgumentParser(description="Carga datos de demo.")
    parser.add_argument("--email", required=True, help="email de un superusuario")
    parser.add_argument("--password", required=True)
    parser.add_argument(
        "--reset", action="store_true", help="borra todo antes de cargar"
    )
    args = parser.parse_args()

    token = authenticate(args.email, args.password)

    if args.reset:
        print("borrando:")
        reset(token)
        print()

    print("cargando:")
    seed(token)
    summarise(token)
    print()
    print("Listo. Las fechas de arriba las calcularon los hooks de Go, no el script.")


if __name__ == "__main__":
    sys.exit(main())
