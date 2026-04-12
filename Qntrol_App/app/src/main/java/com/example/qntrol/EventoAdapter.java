package com.example.qntrol;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.List;

public class EventoAdapter extends RecyclerView.Adapter<EventoAdapter.EventoViewHolder> {

    private final List<Evento> eventoList;
    private final OnItemClickListener listener;

    public interface OnItemClickListener {
        void onItemClick(Evento evento);
    }

    public EventoAdapter(List<Evento> eventoList, OnItemClickListener listener) {
        this.eventoList = eventoList;
        this.listener = listener;
    }

    @NonNull
    @Override
    public EventoViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_evento, parent, false);
        return new EventoViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull EventoViewHolder holder, int position) {
        Evento evento = eventoList.get(position);
        holder.bind(evento, listener);
    }

    @Override
    public int getItemCount() {
        return eventoList.size();
    }

    static class EventoViewHolder extends RecyclerView.ViewHolder {
        TextView tvEventName, tvEventTime;

        public EventoViewHolder(@NonNull View itemView) {
            super(itemView);
            tvEventName = itemView.findViewById(R.id.tvEventName);
            tvEventTime = itemView.findViewById(R.id.tvEventTime);
        }

        public void bind(final Evento evento, final OnItemClickListener listener) {
            tvEventName.setText(evento.getNombreEvento());
            tvEventTime.setText((evento.getFecha() != null ? evento.getFecha() : "--") + 
                                " | " + (evento.getHora() != null ? evento.getHora() : "--"));
            
            itemView.setOnClickListener(v -> listener.onItemClick(evento));
        }
    }
}
