package com.example.qntrol;

public class Evento {
    private String id;
    private String nombreEvento;
    private String fecha;
    private String hora;

    public Evento() {
        // Required for Firestore
    }

    public Evento(String id, String nombreEvento, String fecha, String hora) {
        this.id = id;
        this.nombreEvento = nombreEvento;
        this.fecha = fecha;
        this.hora = hora;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNombreEvento() { return nombreEvento; }
    public void setNombreEvento(String nombreEvento) { this.nombreEvento = nombreEvento; }

    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }

    public String getHora() { return hora; }
    public void setHora(String hora) { this.hora = hora; }
}
